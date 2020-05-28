There are various files for a snowrunner game here are some that I have started on

`CompleteSave.dat` - A JSON encoded object followed by a null byte

`sts_level_{region}_{map}_{n}.dat` - Contains object data, structure as follows

_notes_:
- Items are in order
- Strings are a LE UINT16 length (n) followed by an n character long cstring

1. `UNKNOWN 4 byte header`
2. `ZLIB encoded data`
  - `UNKNOWN 9 bytes`
  - `LE UINT32 object count`
  - `object count objects`
    - `String object type`
    - `String object name`
    - `UNKNOWN 135 bytes`
  - `LE UINT32 vehicle count`
  - `vehicle count vehicles`
    - `String vehicle type`
    - `3 bytes flags`
    - `String vehicle UUID`
    - `LE UINT32 UNKNOWN count`
    - `LE UINT32 cargo count`
    - `UNKNOWN`
  - `UNKOWN`
