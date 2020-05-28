const { app, BrowserWindow } = require('electron');

const createWindow = function() {
  const window = new BrowserWindow({
    title: 'Snowrunner - Save editor',
    width: 800,
    height: 800,
    show: false,
    devTools: true,
    darkTheme: false,
    webPreferences: {
     nodeIntegration: true
    }
  });

  window.loadFile('./src/index.html');
  window.once('ready-to-show', () => {
    window.show();
    window.webContents.openDevTools();
  });
}

app.applicationMenu = null;
app.whenReady().then(createWindow).catch(console.error);
