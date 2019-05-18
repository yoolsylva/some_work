const request = require("request");
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
var atob = require('atob');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--start-maximized'
      //`--window-size=800,800`,
      //'--window-position=0,0'
    ],
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://facebook.com', ['notifications']);

  const pages = await browser.pages();
  const page = pages[0]
  await page.setViewport({width: 1368, height: 768})
  const cookie = 'm_pixel_ratio=1;=;1=;locale=en_GB;c_user=100014459354780;xs=48%3AXUsGcLkrqmlBxw%3A2%3A1558057531%3A9102%3A6266;spin=r.1000722400_b.trunk_t.1558057535_s.1_v.2_;datr=ZBPeXDDc8dTdyEQBM3x92zX2;sb=ZBPeXA9sTkS0ftH6xio-36a-;wd=1232x879;fr=1XasaXmjzhiOVITLc.AWX5avfSF4bnqVD-H3VyqxezDqU.Bc3hNk.OJ.AAA.0.0.Bc3hNn.AWXjj8ww;presence=EDvF3EtimeF1558057845EuserFA21B14459354780A2EstateFDutF1558057844837CEchFDp_5f1B14459354780F0CC;'
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
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36')
  await page.setCookie(...arrCookie)
  // const url = await postToUser({page})
  // console.log(url)
  // const url = await postToPage({page})
  // console.log(url)
}

async function clickDom(page, dom){
  let rect = await page.evaluate(selector => {
    const element = document.querySelector(selector);
    const {x, y, width, height} = element.getBoundingClientRect();
    return {left: x, top: y, width, height, id: element.id};
  }, dom);

  await page.mouse.move(parseFloat(rect.left+rect.width/2), parseFloat(rect.top+rect.height/2));
  await page.mouse.down({button: 'left'});
  await page.mouse.up({button: 'left'});
}

function postToUser({page}) {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(() => {
        resolve(null)
      }, 60000 * 30)
      page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept();
      });

      await page.goto('https://www.facebook.com/?locale=en_US', {waitUntil: 'networkidle0'})
      await page.waitForXPath('//div[@aria-label="Create a post"]')
      await page.click('div[aria-label="Create a post"]')
      await clickDom(page, 'div[aria-label="Create a post"]')
      
      await page.waitFor('div[aria-label="Create a post"] a[aria-label="Insert an emoji"]', {timeout: 100000})
      await page.keyboard.type('hom nay em chan qua, ai den bec em di', {delay: 10});
      await sleep(1000)
      await page.click('div[aria-label="Create a post"]')
      while (true) {
        const isDisable = await page.$x('//div[@aria-label="Create a post"]//button[@type="submit"]/@disabled')
        if (!isDisable.length) break
        await sleep(50)
      }
      await page.click('div[aria-label="Create a post"]')
      await sleep(1000)
      await clickDom(page, 'div[aria-label="Create a post"]')
      page.on('response', async response => {
        if ('xhr' !== response.request().resourceType() && response.request().method !== 'POST') {
          return;
        }
        if (response.url().includes("https://www.facebook.com/webgraphql/mutation/?doc_id=")) {
          if (response.status() !== 200) return resolve(null)
          const text = await response.text()
          var reg = new RegExp('{"id":"(.*?)"}')
          return resolve('https://www.facebook.com/' + atob(text.match(reg)[1]).split(":")[2])
        }
      })
    } catch (e) {
      console.log(e.message)
      resolve(null)
    }
  })
}

async function postToPage({ page }) {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(() => {
        resolve(null)
      }, 60000 * 30)

      page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept();
      });
      const url = `https://www.facebook.com/groups/shiptimnguoinguoitimshipHCM?locale=en_US`
      await page.setViewport({ width: 800, height: 800 })
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.keyboard.press('KeyP');
      await page.waitFor('div[aria-label="Create a post"] a[aria-label="Insert an emoji"]')
      await page.keyboard.type("Mình đang cần tìm người ship ở khu linh đàm sang đan phượng ạ, có ai nhận k", { delay: 10 });
      await sleep(1000)
      while (true) {
        const isDisable = await page.evaluate(() => {
          return document.querySelector('div[aria-label="Create a post"] button[type=submit]').disabled
        })
        if (!isDisable) break
        await sleep(50)
      }
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
          if(!text.match(reg)) return resolve(null)
          const match = atob(text.match(reg)[1])
          const arr = match.split(":")
          const id = arr[arr.length-1]
          console.log('https://www.facebook.com/' +id)
          return resolve('https://www.facebook.com/' + id)
        }
      })
    } catch (e) {
      console.log(e.message)
      resolve(null)
    }
  })

}
main()