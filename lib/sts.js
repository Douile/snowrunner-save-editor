const zlib = require('zlib');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;

const flattenConsumer = async function(obj) {
  let consumed = 0;
  const res = {};
  for (let key in obj) {
    res[key] = obj[key].data;
    consumed += obj[key].consumed;
  }
  res.consumed = consumed;
  return res;
}

const flattenConsumerArray = async function(array) {
  let consumed = 0;
  const res = [];
  for (let item in obj) {
    res.push(obj[key].data);
    consumed += obj[key].consumed;
  }
  return { consumed, data: res };
}

const readHex = async function(buf, off, len) {
  if (isNaN(off)) off = 0;
  if (isNaN(len)) len = buf.length-off;
  let string = [];
  for (let i=off;i<off+len;i++) {
    string.push( buf.readUInt8(i).toString(16).padStart(2,'0') );
  }
  return { consumed: len, data: string };
}

const readBuf = async function(buf, off, len) {
  const res = Buffer.alloc(len);
  buf.copy(res, 0, off, off+len);
  return { consumed: len, data: res };
}

const readString = async function(buf, off) {
  const length = buf.readUInt16LE(off);
  const string = buf.toString('utf8', off+2, off+2+length);
  if (!string.endsWith('\u0000')) throw new Error(`String at 0x${off.toString(16)} [${length}] is not zero padded "${string}"`);
  return { consumed: length+2, data: string };
}

const readUInt32LE = async function(buf, off) {
  return { consumed: 4, data: buf.readUInt32LE(off) };
}

const readUInt16LE = async function(buf, off) {
  return { consumed: 2, data: buf.readUInt16LE(off) };
}

const readUInt8 = async function(buf, off) {
  return { consumed: 1, data: buf.readUInt8(off) };
}

const readObject = async function(buf, off) {
  const res = {};
  res.type = await readString(buf, off);
  off += res.type.consumed;
  res.name = await readString(buf, off);
  off += res.name.consumed;
  res.data = await readBuf(buf, off, 135);
  // 181 -> 153
  // 58 -> 135
  // 245 -> 245
  // 255 -> 135
  return await flattenConsumer(res);
}

const readVehicle = async function(buf, off) {
  const res = {};
  res.type = await readString(buf, off);
  off += res.type.consumed;
  res.flags = await readBuf(buf, off, 3);
  off += res.flags.consumed;
  res.uuid = await readString(buf, off);
  off += res.uuid.consumed;
  res.countA = await readUInt32LE(buf, off);
  off += res.countA.consumed;
  res.countCargo = await readUInt32LE(buf, off);
  off += res.countCargo.consumed;
  // read A

  // read cargo

  // 1609
  // 2933
}

const readCargo = async function(buf, off) {
  const res = {};
  res.type = await readString(buf, off);
  off += res.type.consumed;
  res.model = await readString(buf, off);
  off += res.model.consumed;
  res.countA = await readUInt32LE(buf, off);
  off += res.countA.consumed;
}

const readCargoA = async function(buf, off) {
  const res = {};
  res.header = await readUInt16LE(buf, off);
  off += res.header.consumed;
  res.dataSize = await readUInt8(buf, off);
  off += read.dataSize.consumed;
  res.data = await readBuf(buf, off, res.dataSize.length);
  off += res.data.consumed;
  res.footer = await readUInt16LE(buf, off);
  off += res.footer.consumed;

}

const inflateBuffer = function(buffer, options) {
  return new Promise((resolve, reject) => {
    zlib.inflate(buffer, options, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

const FOOTER_TRUCK =    Buffer.from([ 0x42, 0x01, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00 ]);
const FOOTER_TRAILER =  Buffer.from([ 0x42, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00 ]);

const decodeSTS = async function(file) {
  const buffer = await fs.readFile(file);

  const header = buffer.readInt32LE(0);
  const compressed = Buffer.alloc(buffer.length-4);
  buffer.copy(compressed, 0, 4);
  const data = await inflateBuffer(compressed);

  let offset = 9;

  const objectCount = await readUInt32LE(data, offset);
  offset += objectCount.consumed;

  let objectSuccess = 0;
  const objects = new Array(objectCount.data);
  for (let i=0;i<objectCount.data;i++) {
    let object;
    try {
      object = await readObject(data, offset);
    } catch(e) {
      console.error(e);
      break;
    }
    objects[i] = object;
    offset += object.consumed;
    objectSuccess += 1;
    object.footer = await readBuf(object.data, object.data.length-8, 8);
    if (!object.footer.data.equals(FOOTER_TRAILER) && !object.footer.data.equals(FOOTER_TRUCK)) {
      let footerHex = await readHex(object.footer.data);
      let checkHex = await readHex(FOOTER_TRAILER);
      // 00000000 seems to be for trucks while ffffffff is for trailer
      console.log(`Object at 0x${(offset-object.consumed).toString(16)}-0x${offset.toString(16)} footer ${footerHex.data.join('')} does not match ${checkHex.data.join('')}`);
      console.log((await readHex(object.data)).data.join(' '));
    }
  }
  console.log(`Successfully loaded ${objectSuccess} objects next byte 0x${offset.toString(16)}`);
  // console.log('Commencing object footer check against', await readHex(OBJECT_FOOTER, 0, OBJECT_FOOTER.length));

  const vehicleCount = await readUInt32LE(data, offset);
  offset += vehicleCount.consumed;

  return `Objects=${objectCount.data}, Vehicles=${vehicleCount.data}, totalSize=0x${data.length.toString(16)}`;
}

if (require.main === module) {
  decodeSTS(process.argv[2]).then(console.log).catch(console.error);
}
