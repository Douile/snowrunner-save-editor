const app = require('electron').remote.app;

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

const State = {};
Object.defineProperties(State, {
  activeProfile: {
    enumerable: true,
    get: function() {
      return document.querySelector('.profile-content').getAttribute('data-profile', null);
    },
    set: function(value) {
      return document.querySelector('.profile-content').setAttribute('data-profile', value);
    }
  }
})
const ClickEvents = new EventEmitter();

const SUPPORTED_VERSIONS = [ 1 ];
const PROFILE_DIR = path.join(app.getPath('documents'),'My Games/SnowRunner/base/storage/');
const SAVE_FILE = 'CompleteSave.dat';
const SETTINGS = require('./settings.json');

const readJSON = async function(file) {
  const content = await fs.readFile(file, { encoding: 'utf8' });
  return JSON.parse(content.replace(/\x00$/,''));
}

const fileExists = function(path) {
  return new Promise((resolve) => {
    fs.stat(path)
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
}

const isHex = function(string) {
  return string.match(/[^0-9A-F]/gi) === null;
}

const clearChildren = function(element) {
  for (let child of element.children) {
    child.remove();
  }
}

const init = async function() {
  await initSettings();
  await enumerateProfiles();
}

const initSettings = async function() {
  const content = document.querySelector('.profile-content .content');
  for (let setting of SETTINGS) {
    const label = document.createElement('label');
    label.innerText = setting.display_name;
    label.for = setting.name;
    const input = document.createElement('input');
    input.name = setting.name;

    content.appendChild(label);
    content.appendChild(input);
  }
}

const enumerateProfiles = async function() {
  if (!await fileExists(PROFILE_DIR)) throw Error('Could not find profile directory');
  const files = await fs.readdir(PROFILE_DIR, { withFileTypes: true });
  const profiles = files.filter(ent => ent.isDirectory() && isHex(path.basename(ent.name)));
  const profilesList = document.querySelector('.profile-list');
  clearChildren(profilesList);
  for (let i=0;i<profiles.length;i++) {
    const link = document.createElement('a');
    link.innerText = path.basename(profiles[i].name).substr(0,6);
    link.setAttribute('data-profile', profiles[i].name);
    link.classList.add('profile');
    profilesList.appendChild(link);
  }
}

const getSettingFromPath = function(save, path) {
  let obj = save;
  for (let next of path.split('/')) {
    obj = obj[next];
  }
  return obj;
}

const setActiveProfile = async function(profile) {
  if (profile === State.activeProfile) return;
  State.activeProfile = profile;

  const savePath = path.join(PROFILE_DIR, profile, SAVE_FILE);
  if (!await fileExists(savePath)) throw Error('No save file in profile');

  const save = await readJSON(savePath);
  console.log(save);

  if (!SUPPORTED_VERSIONS.includes(save.cfg_version)) throw Error(`cfg_version ${save.cfg_version} is not supported`);

  for (let setting of SETTINGS) {
    document.querySelector(`input[name=${setting.name}]`).value = getSettingFromPath(save.CompleteSave.SslValue, setting.path);
  }

}

window.addEventListener('click', (e) => {
  for (let className of e.target.classList) {
    ClickEvents.emit(`.${className}`, e);
  }
  if (e.target.id) ClickEvents.emit(`#${e.target.id}`, e);
});

ClickEvents.on('.profile', (e) => {
  setActiveProfile(e.target.getAttribute('data-profile')).catch(console.error);
});

init().then(null).catch(alert);
