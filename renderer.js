
// You can also require other files to run in this process
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const store = new Store();
const fetch = require('node-fetch');
const request = require("request");
const moment = require('moment');
const rimraf = require('rimraf');
const { ipcRenderer } = require('electron');
const {version} = require(path.join(process.cwd(), 'package.json'))
const atob = require('atob')

let browserPath
let browser1, browser2, browser3, browser4, browser5
let page1, page2, page3, page4, page5
let isRunning = false
let isLogin = false
let timeoutPendingPost = []
let intervalUpdateTime = []
let arrPendingPost = []
let arrHistory = []
let started = false

var ovrl = id("overlay"),
  prog = id("progress"),
  stat = id("progstat"),
  c = 0,
  tot = 100;

function id(v) {
  return document.getElementById(v);
}

async function doneLoading() {
  ovrl.style.opacity = 0;
  setTimeout(function () {
    ovrl.style.display = "none";
  }, 1200);
}

function progressLoaded() {
  c += 1;
  var perc = ((100 / tot * c) << 0) + "%";
  prog.style.width = perc;
  stat.innerHTML = "Loading " + perc;
}

async function loadbar(ms) {
  c = 0
  ovrl.style.display = "block"
  ovrl.style.opacity = 50
  for (var i = 0; i < 99; i++) {
    await sleep(ms)
    progressLoaded()
  }
}

function showLoadingData() {
  const loadbar_ovrl = document.getElementById('content-loadbar')
  loadbar_ovrl.style.opacity = 20
  loadbar_ovrl.style.display = "flex"
}

function hideLoadingData() {
  const loadbar_ovrl = document.getElementById('content-loadbar')
  loadbar_ovrl.style.opacity = 0
  loadbar_ovrl.style.display = "none"
}

function createFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.open(filename, 'r', function (err, fd) {
      if (err) {
        fs.writeFile(filename, data, function (err) {
          if (err) {
            console.log(err);
            return reject(err)
          }
          console.log("The file was saved!");
          resolve()
        });
      } else {
        console.log("The file exists!");
        resolve()
      }
    });
  })
}

async function checkLogin() {
  //await sleep(600)
  if (!store.get('slot1.cookie') || !store.get('slot1.name') || !store.get('slot1.id') || !store.get('slot1.picture')) {
    return false
  }
  return true
}

function clearAllInterval() {
  for (var i = 0; i < intervalUpdateTime.length; i++) {
    clearInterval(intervalUpdateTime[i]);
  }
  intervalUpdateTime = []
  for (var i = 0; i < timeoutPendingPost.length; i++) {
    clearTimeout(timeoutPendingPost[i]);
  }
  timeoutPendingPost = []
}

function closeApp() {
  clearAllInterval()
  store.set('slot1.pendingpost', arrPendingPost)
  store.set('slot1.history', arrHistory)
  const remote = require('electron').remote;
  var window = remote.getCurrentWindow();
  window.close();
}

//  This is main download function which takes the url of your image
function download(uri, filename) {
  return new Promise((resolve, reject) => {
    request.head(uri, function (err, res, body) {
      if (err) return reject(err)
      request(uri)
        .pipe(fs.createWriteStream(path.join(process.cwd(), `/photo_upload/${filename}`)))
        .on("close", function () {
          resolve(path.join(process.cwd(), `/photo_upload/${filename}`))
        });
    });
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function logoutFB1() {
  loadbar(10)
  clearAllInterval()
  clearDataInfo()
  await sleep(2000)
  doneLoading()
  setLoginScreen()
}


async function showSaveCookie() {
  var modal = document.getElementById('myModal');
  modal.style.display = "block";
  clearDataInfo()
}

async function loginFB1() {
  var modal = document.getElementById('myModal');
  modal.style.display = "none";
  const cookie = document.getElementById('cookie').value
  const output = {};
  const arrCookie = []
  cookie.split(/\s*;\s*/).forEach(function (pair) {
    pair = pair.split(/\s*=\s*/);
    output[pair[0]] = pair.splice(1).join('=');
  });
  const time = parseInt((new Date().getTime() / 1000).toFixed(0)) + 11573456
  for (const key in output) {
    const tmpCookie = {
      "name": "",
      "value": "",
      "domain": ".facebook.com",
      "path": "/",
      "expires": time,
      "size": 100,
      "httpOnly": true,
      "secure": true,
      "session": false
    }
    tmpCookie.name = key
    tmpCookie.value = output[key]
    arrCookie.push(tmpCookie)
  }
  store.set(`slot1.cookie`, arrCookie)
  modal.style.display = "none";
  loadbar(200)
  browser1 = await puppeteer.launch({
    headless: true,
    slowMo: 50,
    //userDataDir: userDataDir,
    executablePath: browserPath,
    args: [
      `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.62 Safari/537.36`,
    ]
  });
  const context = browser1.defaultBrowserContext();
  await context.overridePermissions('https://facebook.com', [
    'geolocation',
    'notifications',
    'background-sync',
    'midi',
    'midi-sysex',
    'camera',
    'microphone',
    'ambient-light-sensor',
    'accelerometer',
    'gyroscope',
    'magnetometer',
    'accessibility-events',
    'clipboard-read',
    'clipboard-write',
    'payment-handler'
  ]);
  const pages = await browser1.pages();
  page1 = pages[0]
  await page1.setViewport({ width: 1000, height: 800 })

  await page1.setCookie(...arrCookie)
  await page1.goto('https://facebook.com', { waitUntil: 'networkidle0', timeout: 100000 });
  let count = 0
  while (true) {
    await sleep(500)
    count += 500
    if (count > 60000) {
      store.delete(`slot1.cookie`)
      alert('Đăng nhập thất bại, xin hãy tắt ứng dụng và thử dùng cookie khác đăng nhập lại')
      break
    }
    try {
      const result = await page1.evaluate(() => {
        var html = document.getElementsByTagName('html')[0].innerHTML
        var re = new RegExp('"USER_ID":"(.*?)"')
        var result = html.match(re);
        var profile_id = result && result[1]
        let username = document.querySelector('div[data-click="profile_icon"] a').getAttribute('href').replace('https://www.facebook.com/', '')
        if (username.includes('profile.php?id=')) username = username.replace('profile.php?id=', '')
        re = new RegExp('"NAME":"(.*?)"')
        result = html.match(re);
        var name = result && JSON.parse('"' + result[1] + '"')
        var img = document.querySelector('div[data-click="profile_icon"] a img').getAttribute('src')

        if (!profile_id || !img || !name || !username) return null
        return { profile_id, img, name, username }
      })

      if (!result) continue
      const { profile_id, img, username, name } = result
      console.log(result)

      await page1.goto(`https://facebook.com/${profile_id}`, { waitUntil: 'networkidle0', timeout: 100000 });
      await page1.waitForSelector('.photoContainer')
      const { img_bigger } = await page1.evaluate(() => {
        const img_bigger = document.querySelector('.photoContainer img').getAttribute('src')
        return { img_bigger }
      })
      await browser1.close()
      console.log(img_bigger)
      doneLoading()
      setMainScreen()
      saveDataInfo({ profile_id, name, username, img: img_bigger ? img_bigger : img })
      showDataInfo({ profile_id, name, username, img: img_bigger ? img_bigger : img })
      break
    } catch (e) {
      console.error(e.message)
    }
  }
}

function setLoginScreen() {
  document.getElementById("main-panel").style.display = 'none'
  document.getElementById("login-panel").style.display = 'flex'
}

function setMainScreen() {
  document.getElementById("main-panel").style.display = 'block'
  document.getElementById("login-panel").style.display = 'none'
}

function clearDataInfo() {
    arrPendingPost = []
    arrHistory = []
    store.delete(`slot1.id`)
    store.delete(`slot1.name`)
    store.delete(`slot1.picture`)
    store.delete(`slot1.history`)
    store.delete(`slot1.pendingpost`)
    store.delete(`slot1.cookie`)
}

function saveDataInfo({ profile_id, name, img, username }) {
  store.set(`slot1.id`, profile_id)
  store.set(`${profile_id}`, 'slot1')
  store.set(`slot1.name`, name)
  store.set(`slot1.username`, username)
  store.set(`slot1.picture`, img)
}

function getDataInfo() {
  const profile_id = store.get('slot1.id')
  const name = store.get('slot1.name')
  const img = store.get('slot1.picture')
  const username = store.get('slot1.username')
  return { profile_id, name, img, username }
}

function showDataInfo({ profile_id, name, img }) {
  document.getElementById('fb-avatar').setAttribute('src', img)
  document.getElementById('fb-uid').innerText = profile_id
  document.getElementById('fb-name').innerText = name
}

async function clickDom(page, dom) {
  let rect = await page.evaluate(selector => {
    const element = document.querySelector(selector);
    const { x, y, width, height } = element.getBoundingClientRect();
    return { left: x, top: y, width, height, id: element.id };
  }, dom);

  await page.mouse.move(parseFloat(rect.left + rect.width / 2), parseFloat(rect.top + rect.height / 2));
  await page.mouse.down({ button: 'left' });
  await page.mouse.up({ button: 'left' });
}

function postToUser({ page, profile_id, resJson, imageFiles, videoFiles }) {
  return new Promise(async (resolve, reject) => {
    try {
      page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept();
      });
      await page.goto('https://www.facebook.com/?locale=en_US', { timeout: 100000, waitUntil: 'networkidle0' });
      await page.waitForXPath('//div[@aria-label="Create a post"]')
      await page.click('div[aria-label="Create a post"]')
      await clickDom(page, 'div[aria-label="Create a post"]')

      await page.waitFor('div[aria-label="Create a post"] a[aria-label="Insert an emoji"]')
      await page.keyboard.type(resJson.content, { delay: 0 });
      const input = await page.$('input[type=file]')
      imageFiles && imageFiles.length && await input.uploadFile(...imageFiles)
      videoFiles && videoFiles.length && await input.uploadFile(...videoFiles)
      await page.click('div[aria-label="Create a post"]')
      setTimeout(() => {
        resolve(null)
      }, 60000 * 3)
      while (true) {
        const isDisable = await page.$x('//div[@aria-label="Create a post"]//button[@type="submit"]/@disabled')
        if (!isDisable.length) break
        await sleep(50)
      }
      await page.click('div[aria-label="Create a post"]')
      await sleep(1000)
      await clickDom(page, 'div[aria-label="Create a post"]')
      await clickDom(page, 'div[aria-label="Create a post"] button[type=submit]')
      await page.click('div[aria-label="Create a post"] button[type=submit]')

      page.on('response', async response => {
        if ('xhr' !== response.request().resourceType() && response.request().method !== 'POST') {
          return;
        }
        if (response.url().includes("https://www.facebook.com/webgraphql/mutation/?doc_id=")) {
          if (response.status() !== 200) return resolve(null)
          const text = await response.text()
          var reg = new RegExp('{"id":"(.*?)"}')
          if (!text.match(reg)) return resolve(null)
          const match = atob(text.match(reg)[1])
          const arr = match.split(":")
          if (!arr || !arr.length) return resolve(null)
          const id = arr[arr.length - 1]
          return resolve('https://www.facebook.com/' + id)
        }
      })
    } catch (e) {
      console.log(e.message)
      resolve(null)
    }
  })
}

async function postToPage({ page, page_id, imageFiles, resJson, videoFiles }) {
  return new Promise(async (resolve, reject) => {
    try {
      page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept();
      });
      const url = `https://facebook.com/${page_id}?locale=en_US`
      await page.setViewport({ width: 800, height: 800 })
      await page.goto(url, { timeout: 100000, waitUntil: 'networkidle0' });
      await page.keyboard.press('KeyP');
      //await page.click('div[aria-label="Create a post"]')
      await page.waitFor('div[aria-label="Create a post"] a[aria-label="Insert an emoji"]')
      await page.keyboard.type(resJson.content, { delay: 10 });
      await page.click('div[data-testid=photo-video-button]')
      await page.waitForSelector("input[data-testid=media-attachment-add-photo]")
      const input = await page.$("input[data-testid=media-attachment-add-photo]")
      imageFiles && imageFiles.length && await input.uploadFile(...imageFiles)
      videoFiles && videoFiles.length && await input.uploadFile(...videoFiles)
      setTimeout(() => {
        resolve(null)
      }, 60000 * 3)
      await sleep(1000)
      while (true) {
        const isDisable = await page.evaluate(() => {
          return document.querySelector('div[aria-label="Create a post"] button[type=submit]').disabled
        })
        if (!isDisable) break
        await sleep(50)
      }
      await page.click('div[aria-label="Create a post"]')
      const share = await page.$('div[aria-label="Create a post"] button[type=submit]')
      await share.click()
      page.on('response', async response => {
        if ('xhr' !== response.request().resourceType() && response.request().method !== 'POST') {
          return;
        }
        if (response.url().includes("https://www.facebook.com/webgraphql/mutation/?doc_id=")) {
          if (response.status() !== 200) return resolve(null)
          const text = await response.text()
          var reg = new RegExp('{"id":"(.*?)"}')
          if (!text.match(reg)) return resolve(null)
          const match = atob(text.match(reg)[1])
          const arr = match.split(":")
          if (!arr || !arr.length) return resolve(null)
          const id = arr[arr.length - 1]
          return resolve('https://www.facebook.com/' + id)
        }
      })
    } catch (e) {
      console.log(e.message)
      resolve(null)
    }
  })

}

async function postToGroup({ page, group_id, imageFiles, resJson, videoFiles }) {
  return new Promise(async (resolve, reject) => {
    try {
      page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept();
      });
      const url = `https://facebook.com/${group_id}?locale=en_US`
      await page.setViewport({ width: 800, height: 800 })
      await page.goto(url, { timeout: 100000, waitUntil: 'networkidle0' });
      // await page.waitForXPath('//*[@data-testid="status-attachment-mentions-input"] | //*[@data-testid="react-composer-root"]//*[@data-testid="status-attachment-selector"]')
      // const inputText = await page.$x('//*[@data-testid="status-attachment-mentions-input"]//div | //*[@data-testid="react-composer-root"]//*[@data-testid="status-attachment-selector"]')
      // if (!inputText.length) throw new Error('Not found input text in group!')
      // await inputText[0].click()
      // await sleep(1000)
      // try {
      //   await page.type('[data-testId="status-attachment-mentions-input"]', resJson.content)
      // } catch (e) {
      //   await page.keyboard.type(resJson.content, {delay: 10});
      // }
      await page.keyboard.press('KeyP');
      await page.click('div[aria-label="Create a post"]')
      //await page.waitFor('div[aria-label="Create a post"]')
      //await page.click('div[aria-label="Create a post"]')
      await page.waitFor('div[aria-label="Create a post"] a[aria-label="Insert an emoji"]')
      await page.keyboard.type(resJson.content, { delay: 10 });

      const input = await page.$('input[data-testid=media-sprout]')
      imageFiles && imageFiles.length && await input.uploadFile(...imageFiles)
      videoFiles && videoFiles.length && await input.uploadFile(...videoFiles)
      setTimeout(() => {
        resolve(null)
      }, 60000 * 3)
      await sleep(500)
      await page.waitForSelector('button[data-testid=react-composer-post-button]')
      while (true) {
        const isDisable = await page.evaluate(() => {
          return document.querySelector('div[aria-label="Create a post"] button[type=submit]').disabled
        })
        if (!isDisable) break
        await sleep(50)
      }
      await page.click('div[aria-label="Create a post"]')
      const share = await page.$('div[aria-label="Create a post"] button[type=submit]')
      await share.click()
      page.on('response', async response => {
        if ('xhr' !== response.request().resourceType() && response.request().method !== 'POST') {
          return;
        }
        if (response.url().includes("https://www.facebook.com/webgraphql/mutation/?doc_id=")) {
          if (response.status() !== 200) return resolve(null)
          const text = await response.text()
          var reg = new RegExp('{"id":"(.*?)"}')
          if (!text.match(reg)) return resolve(null)
          const match = atob(text.match(reg)[1])
          const arr = match.split(":")
          if (!arr || !arr.length) return resolve(null)
          const id = arr[arr.length - 1]
          return resolve('https://www.facebook.com/' + id)
        }
      })
    } catch (e) {
      console.log(e.message)
      resolve(null)
    }
  })
}

function printLog(text) {
  console.log(text)
  ipcRenderer.send('message', text)
  fs.appendFile('error.txt', `${JSON.stringify(text)}\n`, function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
}

function clearLog() {
}

function getRandomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function appendPost({ resJson, status, slotNumber }) {
  const item = document.createElement('li')
  item.setAttribute('id', `${resJson.id}`)
  item.setAttribute('class', 'list-post')
  const img = document.createElement('img')
  img.setAttribute('class', 'post-thumpnail')
  img.setAttribute('src', resJson.images.length ? resJson.images[0] : 'assets/img/apf_tool_logo.png')
  const h5 = document.createElement('h5')
  h5.innerText = resJson.content
  const imgEye = document.createElement('img')
  imgEye.setAttribute('class', 'eye-icon dropdown')
  imgEye.setAttribute('src', 'assets/img/eye-icon.png')

  const now = moment(new Date()); //todays date
  const end = moment(resJson.date_publish); // another date
  const duration = moment.duration(end.diff(now)) > 0 ? moment.duration(end.diff(now)) : moment.duration(0);
  let totalTime = parseInt(duration.asSeconds())
  //let totalTime = getRandomBetween(20, 30)
  const { mnts, hrs, seconds } = convertSecondsToCountdown(totalTime)

  const p1 = document.createElement('p')
  p1.innerText = 'Ngày tạo: ' + moment(resJson.date_publish).format('DD/MM/YYYY')
  const p2 = document.createElement('p')
  p2.innerText = 'Tổng content đăng: ' + resJson.images.length
  const spanStatus = document.createElement('span')
  const imgStatus = document.createElement('img')
  imgStatus.setAttribute('src', `assets/img/${status}.png`)
  const pStatus = document.createElement('p')
  pStatus.innerText = status === 'wait' ? 'Đang chờ' : ''
  spanStatus.appendChild(imgStatus)
  spanStatus.appendChild(pStatus)

  item.appendChild(img)
  item.appendChild(h5)
  item.appendChild(p1)
  item.appendChild(imgEye)
  item.appendChild(p2)
  const countdount = document.createElement('p')
  countdount.innerText = `Đếm ngược: ${hrs}:${mnts}:${seconds}`
  item.appendChild(countdount)
  item.appendChild(spanStatus)

  document.getElementById('pending-post').appendChild(item)

  intervalUpdateTime.push(setInterval(() => {
    if (totalTime <= 0) {
      countdount.innerText = `Đếm ngược: 00:00:00`
      return
    }
    const { hrs, mnts, seconds } = convertSecondsToCountdown(--totalTime)
    countdount.innerText = `Đếm ngược: ${hrs}:${mnts}:${seconds}`
  }, 1000))

  timeoutPendingPost.push(setTimeout(async () => {
    printLog('wait running')
    await waitForRunningDone()
    printLog('posting now')
    for (let i = arrPendingPost.length - 1; i >= 0; i--) {
      if (arrPendingPost[i].id === resJson.id) arrPendingPost.splice(i, 1);
    }
    imgStatus.setAttribute('src', `assets/img/play.png`)
    pStatus.innerText = 'Đang post...'
    let browser
    try {
      isRunning = true
      const profile_id = resJson.profile_id
      const imageFiles = await Promise.all(resJson.images.map((image, index) => {
        return download(image, `${index}.png`)
      })).catch(e => {
        let myNotification = new Notification('Lỗi', {
          body: 'Link hình ảnh không hợp lệ'
        })
      })
      const videoFiles = await Promise.all(resJson.videos.map((video, index) => {
        return download(video, `${index}.mp4`)
      })).catch(e => {
        let myNotification = new Notification('Lỗi', {
          body: 'Link video không hợp lệ'
        })
      })
      browser = await puppeteer.launch({
        headless: false,
        slowMo: 50,
        executablePath: browserPath,
        args: [
          `--window-size=800,800`
        ],
      });
      const pages = await browser.pages();
      const page = pages[0]
      const cookieSaved = store.get(`slot1.cookie`)
      await page.setCookie(...cookieSaved)

      const data = []
      let postPageTask, postGroupTask
      if (resJson.fanpage_ids.length) {
        await page.evaluate(() => window.open('https://www.google.com', 'page', 'height=800,width=800,top=0,left=700'));
        const newWindowTargetPage = await browser.waitForTarget(target => target.url() === 'https://www.google.com/');
        const newPage = await newWindowTargetPage.page()

        const postToAllPage = async () => {
          for (let i = 0; i < resJson.fanpage_ids.length; i++) {
            let postPageLink = null
            try {
              postPageLink = await postToPage({ page: newPage, page_id: resJson.fanpage_ids[i], imageFiles, resJson, videoFiles })
            } catch (e) {
              printLog(e.message)
            } finally {
              data.push({ id: resJson.id, status: postPageLink? true: false, fb_id: resJson.fanpage_ids[i], url: postPageLink })
            }
          }
        }
        postPageTask = postToAllPage()
      }
      if (resJson.group_ids.length) {
        await page.evaluate(() => window.open('https://www.google.com.vn/', 'group', 'height=800,width=800,top=0,left=1100'));
        const newWindowTargetGroup = await browser.waitForTarget(target => target.url() === 'https://www.google.com.vn/');
        const newPageGroup = await newWindowTargetGroup.page()

        const postToAllGroup = async () => {
          for (let i = 0; i < resJson.group_ids.length; i++) {
            let postGroupLink = null
            try {
              postGroupLink = await postToGroup({
                page: newPageGroup,
                group_id: resJson.group_ids[i],
                imageFiles,
                resJson,
                videoFiles
              })
            } catch (e) {
              printLog(e.message)
            } finally {
              data.push({ id: resJson.id, status: postGroupLink? true: false, fb_id: resJson.group_ids[i], url: postGroupLink })
            }
          }
        }
        postGroupTask = postToAllGroup()
      }
      if (resJson.profile_id && resJson.profile_id.length) {
        const postUserTask = postToUser({ page, profile_id, imageFiles, resJson, videoFiles })

        let postUserLink = null
        try {
          postUserLink = await postUserTask
        } catch (e) {
          printLog(e.message)
        } finally {
          data.push({ id: resJson.id,  status: postUserLink? true: false, fb_id: profile_id, url: postUserLink })
        }
      } else {
        await page.close()
      }

      if (resJson.fanpage_ids.length) await postPageTask
      if (resJson.group_ids.length) await postGroupTask

      printLog({ key: 'OTJhMTJDMTRtcThTMTIwMkc1M3g', data })

      const result = await fetch('http://kingcontent.pro/api/response-data.php', {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ key: 'OTJhMTJDMTRtcThTMTIwMkc1M3g', data })
      })
      printLog(result)
    } catch (e) {
      printLog(e)
    } finally {
      if (browser) await browser.close()
      isRunning = false
      updatePendingPost({ resJson, type: 'remove', slotNumber })
    }
  }, Number(totalTime) * 1000))
}

function waitForRunningDone() {
  return new Promise(async resolve => {
    while (true) {
      await sleep(5000)
      if (!isRunning) resolve()
    }
  })
}

function convertSecondsToCountdown(seconds) {
  //var days = Math.floor(parseInt(seconds) / (3600*24));
  //seconds  -= days*3600*24;
  var hrs = Math.floor(seconds / 3600);
  seconds -= hrs * 3600;
  var mnts = Math.floor(seconds / 60);
  seconds -= mnts * 60;
  //days = days > 9? days : '0' + days
  hrs = hrs > 9 ? hrs : '0' + hrs
  mnts = mnts > 9 ? mnts : '0' + mnts
  seconds = seconds > 9 ? seconds : '0' + seconds
  return { hrs, mnts, seconds }
}

function clearPendingPost() {
  var myNode = document.getElementById('pending-post')
  while (myNode.firstChild) {
    myNode.removeChild(myNode.firstChild);
  }
}

function updatePendingPost({ resJson, type, slotNumber }) {
  switch (type) {
    case 'add':
      let found = false
      for (let i = 0; i < arrPendingPost.length; i++) {
        if (arrPendingPost[i].id === resJson.id ||  document.getElementById(`${resJson.id}`)) found = true
      }
      if (found) return
      arrPendingPost.push(resJson)
      arrPendingPost = arrPendingPost.sort((a, b) => {
        if (moment(a.date_publish) < moment(b.date_publish)) return 1
        else if (moment(a.date_publish) > moment(b.date_publish)) return -1
        return 0
      })
      appendPost({ resJson, status: 'wait', slotNumber })
      break;
    case 'remove':
      const elementPost = document.getElementById(`${resJson.id}`)
      if (elementPost) elementPost.parentNode.removeChild(elementPost)
      break;
    default:
      for (let i = 0; i < arrPendingPost.length; i++) {
        appendPost({ resJson: arrPendingPost[i], status: 'wait', slotNumber })
      }
  }
}

async function schedulePost() {
  clearLog()
  printLog('Started!')
  const profile_id = store.get('slot1.id')
  if (!profile_id) {
    printLog('Information not saved')
    return
  }
  printLog('Loading data...')
  try {
    const res = await fetch(`http://kingcontent.pro/api/get-pending-data.php?key=OTJhMTJDMTRtcThTMTIwMkc1M3g&fb_id=${profile_id}`)
    const resJson = await res.json()
    if (resJson.error) throw new Error(resJson.message)
    printLog(`receive new data:`)
    //printLog(resJson)
    document.getElementById('number-scheduled-post').innerText = resJson.data.length + arrPendingPost.length
    resJson.data.forEach(data => {
      //if(moment(data.date_publish).isBefore(moment())) return
      updatePendingPost({ resJson: data, type: 'add', slotNumber: 'slot1' })
    })
  } catch (e) {
    printLog(e.message)
    let myNotification = new Notification('Lỗi', {
      body: e.message
    })
  }
}

async function scheduleHistory() {
  const profile_id = store.get('slot1.id')
  try {
    const res = await fetch(`http://kingcontent.pro/api/get-schedules.php?key=OTJhMTJDMTRtcThTMTIwMkc1M3g&fb_id=${profile_id}`)
    const resJson = await res.json()
    if (resJson.error) throw new Error(resJson.message)
    if (!resJson.data.schedules || !resJson.data.schedules.length) return
    document.getElementById('number-saved-post').innerText = resJson.data.total_saved_posts
    document.getElementById('number-saved-page').innerText = resJson.data.total_saved_pages
    document.getElementById('number-collection-post').innerText = resJson.data.total_collection_posts

    updateHistory({ data: resJson.data.schedules, type: 'replace' })
  } catch (e) {
    printLog(e.message)
  }
}

function clearHistory() {
  var myNode = document.getElementById('history-scheduled')
  while (myNode.firstChild) {
    myNode.removeChild(myNode.firstChild);
  }
}

function appendHistory({ data }) {
  const item = document.createElement('li')
  item.setAttribute('class', 'list-post')
  const img = document.createElement('img')
  img.setAttribute('class', 'post-thumpnail')
  img.setAttribute('src', data.contents.images.length ? data.contents.images[0] : data.thumbnail)
  const h5 = document.createElement('h5')
  h5.innerText = data.name

  const elmDropdown = document.createElement('div')
  elmDropdown.setAttribute('class', 'dropdown')

  const elmDropdownContent = document.createElement('div')
  elmDropdownContent.setAttribute('class', 'dropdown-content')
  if (data.contents.url) {
      const elmUrl = document.createElement('a')
      elmUrl.innerText = 'Xem bài viết'
      elmUrl.onclick = async () => {
        const browserReview = await puppeteer.launch({
          headless: false,
          slowMo: 50,
          executablePath: browserPath,
        });
        const pages = await browserReview.pages();
        const page = pages[0]
        const arrCookie = store.get('slot1.cookie')
        await page.setCookie(...arrCookie)
        await page.setViewport({ width: 1000, height: 800 })
        await page.goto(data.contents.url, { timeout: 0 })
      }
      elmDropdownContent.appendChild(elmUrl)
  }
  elmDropdown.appendChild(elmDropdownContent)

  const imgEye = document.createElement('img')
  imgEye.setAttribute('class', 'eye-icon dropdown')
  imgEye.setAttribute('src', 'assets/img/eye-icon.png')

  elmDropdown.appendChild(imgEye)

  const p1 = document.createElement('p')
  p1.innerText = 'Ngày tạo: ' + moment(data.created).format('DD/MM/YYYY')
  const p2 = document.createElement('p')
  p2.innerText = 'Tổng content đăng: ' + data.contents.images.length
  const spanStatus = document.createElement('span')
  const imgStatus = document.createElement('img')
  imgStatus.setAttribute('src', status ? `assets/img/done.png` : `assets/img/stop.png`)
  const pStatus = document.createElement('p')
  pStatus.innerText = status ? 'Hoàn tất' : 'Gặp Lỗi'
  spanStatus.appendChild(imgStatus)
  spanStatus.appendChild(pStatus)

  item.appendChild(img)
  item.appendChild(h5)
  item.appendChild(p1)
  item.appendChild(elmDropdown)
  item.appendChild(p2)
  const countdount = document.createElement('p')
  countdount.innerText = 'Ngày đăng: ' + data.contents.date_publish
  item.appendChild(countdount)
  item.appendChild(spanStatus)

  document.getElementById('history-scheduled').appendChild(item)
}

function updateHistory({ data, type }) {
  switch (type) {
    case 'add':
      arrHistory.unshift(data)
      clearHistory()
      store.set(`slot1.history`, arrHistory)
      for (let i = 0; i < arrHistory.length; i++) {
        appendHistory({ data: arrHistory[i] })
      }
      break;
    case 'replace':
      clearHistory()
      arrHistory = data
      arrHistory = arrHistory.sort((a, b) => {
        if (moment(a.contents.date_publish) < moment(b.contents.date_publish)) return 1
        else if (moment(a.contents.date_publish) > moment(b.contents.date_publish)) return -1
        return 0
      })
      for (let i = 0; i < arrHistory.length; i++) {
        appendHistory({ data: arrHistory[i] })
      }
      break;
    default:
      clearHistory()
      for (let i = 0; i < arrHistory.length; i++) {
        appendHistory({ data: arrHistory[i] })
      }
  }
}

async function start() {
  if (started) return
  showLoadingData()
  schedulePost()
  setInterval(schedulePost, 60000 * 1)
  await scheduleHistory()
  setInterval(scheduleHistory, 60000)
  started = true
  hideLoadingData()
}

async function main() {
  loadbar(7)
  document.getElementById('app-version').innerText = 'v' + version
  createFile(path.join(process.cwd(), 'chrome-path.txt'), 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe').then(() => {
    browserPath = fs.readFileSync(path.join(process.cwd(), 'chrome-path.txt')).toString()
  })
  !fs.existsSync(path.join(process.cwd(), 'photo_upload')) && fs.mkdirSync(path.join(process.cwd(), 'photo_upload'));
  !fs.existsSync(path.join(process.cwd(), 'facebook_account')) && fs.mkdirSync(path.join(process.cwd(), 'facebook_account'));
  isLogin = await checkLogin()
  doneLoading()
  if (!isLogin) setLoginScreen()
  else {
    setMainScreen()
    const { profile_id, name, img } = getDataInfo()
    showDataInfo({ profile_id, name, img })
    arrPendingPost = store.get(`slot1.pendingpost`) || []
    arrHistory = store.get(`slot1.history`) || []
    for (let i = arrPendingPost.length - 1; i >= 0; i--) {
      if (moment(arrPendingPost[i].date_publish).isBefore(moment())) arrPendingPost.splice(i, 1);
    }
    arrPendingPost.forEach(data => {
      updatePendingPost({ resJson: data, slotNumber: 'slot1' })
    })

    updateHistory({ data: arrHistory, type: 'replace' })
  }
}

document.addEventListener('DOMContentLoaded', main, false);