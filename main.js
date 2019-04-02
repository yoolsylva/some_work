const {app, BrowserWindow, ipcMain, session} = require('electron');
const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 500,
    height: 850,
    frame: false,
    resizable: false
  })

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'login.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Code to create fb authentication window
/*ipcMain.on('fb-authenticate', async function (event, arg) {
  var options = {
    client_id: Env.fb_client_id,
    client_secret: Env.fb_client_secret,
    scopes: 'email,user_posts,publish_pages,publish_to_groups,user_status,publish_video,manage_pages',
    redirect_uri: 'https://www.facebook.com/connect/login_success.html'
  };

  var authWindow = new BrowserWindow({
    width: 450,
    height: 300,
    show: false,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false
    }
  });
  var facebookAuthURL = `https://www.facebook.com/v3.2/dialog/oauth?client_id=${options.client_id}&redirect_uri=${options.redirect_uri}&response_type=token,granted_scopes&scope=${options.scopes}&display=popup`;

  authWindow.loadURL(facebookAuthURL);
  authWindow.webContents.on('did-finish-load', function () {
    authWindow.show();
  });

  var access_token, error;
  var closedByUser = true;

  var handleUrl = async function (url) {


    var raw_code = /access_token=([^&]*)/.exec(url) || null;
    access_token = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
    error = /\?error=(.+)$/.exec(url);

    if (access_token || error) {
      const res = await fetch(`https://graph.facebook.com/v3.2/oauth/access_token?grant_type=fb_exchange_token&client_id=${options.client_id}&client_secret=${options.client_secret}&fb_exchange_token=${access_token}`)
      const resJson = await res.json()
      if (resJson.error) console.log(resJson)
      else access_token = resJson.access_token
      console.log(access_token)
      closedByUser = false;
      FB.setAccessToken(access_token);
      FB.api(`/me`, {
        fields: ['id', 'name', 'picture.width(800).height(800)']
      }, function (res) {
        if (!res || res.error) {
          console.log('error: ', res);
          return
        }

        console.log(res)

        mainWindow.webContents.executeJavaScript(`document.getElementById("fb-name").innerHTML = "Name: ${res.name}"`);
        mainWindow.webContents.executeJavaScript(`document.getElementById("fb-id").innerHTML = "ID: ${res.id}"`);
        mainWindow.webContents.executeJavaScript(`document.getElementById("fb-pp").src = "${res.picture.data.url}"`);
        mainWindow.webContents.executeJavaScript(`document.getElementById("access_token").value = "${access_token}"`);

        store.set(`slot1.id`, res.id)
        store.set(`slot1.name`, res.name)
        store.set(`slot1.picture`, res.picture.data.url)
        store.set(`${res.id}.access_token`, access_token)
      });
    }
  }

  authWindow.webContents.on('will-navigate', (event, url) => {
    handleUrl(url)
  });
  var filter = {
    urls: [options.redirect_uri + '*']
  };
  session.defaultSession.webRequest.onCompleted(filter, (details) => {
    var url = details.url;
    handleUrl(url);
  });

  authWindow.on('close', () => event.returnValue = closedByUser ? {error: 'The popup window was closed'} : {
    access_token,
    error
  })

  /!*let driver = await new Builder().forBrowser('chrome').build();
  try {
    await driver.get('http://www.google.com/ncr');
    await driver.findElement(By.name('q')).sendKeys('webdriver', Key.RETURN);
    await driver.wait(until.titleIs('webdriver - Google Search'), 1000);
  } finally {
    await driver.quit();
  }*!/
})*/

/*ipcMain.on('fb-logout', async function (event, arg) {
  session.defaultSession.clearStorageData()
  const id = store.get(`slot1.id`)
  store.delete(id)
  store.delete(`slot1`)

  mainWindow.webContents.executeJavaScript(`document.getElementById("fb-name").innerHTML = ""`);
  mainWindow.webContents.executeJavaScript(`document.getElementById("fb-id").innerHTML = ""`);
  mainWindow.webContents.executeJavaScript(`document.getElementById("fb-pp").src = "assets/img/default-profile-pic.jpg"`);
  mainWindow.webContents.executeJavaScript(`document.getElementById("access_token").value = ""`);
})*/

/*setTimeout(async function () {
  console.log('start job')
  try {
    const res = await fetch('http://lamface.com/api/get-pending-data.php?key=OTJhMTJDMTRtcThTMTIwMkc1M3g&fbclid=IwAR1GQbGkX3BxpEFybxjtuHzD_YkTvLhfW4apfaDHijwLfWBfFiyfNI98TKU')
    const resJson = await res.json()
    const profile_id = '125329431881741'
    const access_token = store.get(`${profile_id}.access_token`)
    if (!access_token) {
      console.log(`not found access_token for profile_id: ${profile_id}`)
      return
    }
    FB.setAccessToken(access_token);
    for(let i = 0; i < resJson.page_ids.length; i++) {
      let page_id = resJson.page_ids[i]
      let page_access_token = store.get(`${profile_id}.${page_id}.access_token`)
      if (!page_access_token) {
        page_access_token = await getPageToken(page_id)
        store.set(`${profile_id}.${page_id}.access_token`, page_access_token)
      }

      FB.setAccessToken(page_access_token);
      const idPhotos = await Promise.all(resJson.images.map(image => {
        return uploadPhoto({image, id: page_id})
      }))

      FB.api(`/me/feed`, 'post', {
        message: resJson.content,
        attached_media: idPhotos
      }, function (res) {
        if (!res || res.error) {
          console.log(res.error);
          return
        }
        console.log(`success post ${res.id}`)
      });
    }

    for(let i = 0; i < resJson.group_ids.length; i++) {
      let group_id = resJson.group_ids[i]

      FB.setAccessToken(access_token);
      const idPhotos = await Promise.all(resJson.images.map(image => {
        return uploadPhoto({image, id: group_id})
      }))

      FB.api(`/${group_id}/feed`, 'post', {
        message: resJson.content,
        attached_media: idPhotos
      }, function (res) {
        if (!res || res.error) {
          console.log(res.error);
          return
        }
        console.log(`success post ${res.id}`)
      });
    }


  } catch (e) {
    console.log(e.message)
  }
}, 5000)*/

/*
function getPageToken(page_id) {
  return new Promise((resolve, reject) => {
    FB.api(`/${page_id}`, {
      fields: ['access_token']
    }, function (res) {
      if (!res || res.error) {
        console.log('error: ', res);
        return resolve(null)
      }
      resolve(res.access_token)
    });
  })
}

function uploadPhoto({image, id}) {
  return new Promise((resolve, reject) => {
    FB.api(`/${id}/photos`, 'post', {
      url: image,
      published: false
    }, function (res) {
      if(!res || res.error) {
        console.log(!res ? 'error occurred' : res.error);
        return resolve()
      }
      resolve({media_fbid: res.id})
    });
  })
}
*/
