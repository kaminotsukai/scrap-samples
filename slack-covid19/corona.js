const puppeteer = require('puppeteer');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
require("dotenv").config();

(async () => {
  // ブラウザを開く
  const browser = await puppeteer.launch();

  // 新規タブを開く
  const page = await browser.newPage();

  // timeout: 0 でタイムアウトをなくす
  await page.goto('https://stopcovid19.metro.tokyo.lg.jp/', {
    waitUntil: 'domcontentloaded',
    timeout: 0
  });

  /////////////////
  // 1.陽性患者数
  await page.waitForSelector('.DataCard:nth-child(4) > .DataView > .DataView-Inner > .DataView-Header > .DataView-DataInfo > .DataView-DataInfo-summary');

  // page.evaluateメソッドを使うことで通常のJavaScript記述で処理できる
  const positiveSummary = await page.evaluate(() => {
    return document.querySelector('.DataCard:nth-child(4) > .DataView > .DataView-Inner > .DataView-Header > .DataView-DataInfo > .DataView-DataInfo-summary').textContent
  })

  // 取得したデータの整形
  const numberOfPositive = confirmContainText(positiveSummary)


  /////////////////
  // 2.調査年月日
  const reseachDate = await page.evaluate(() => {
    return document.querySelector('.DataCard:nth-child(4) > .DataView > .DataView-Inner > .DataView-Header > .DataView-DataInfo > .DataView-DataInfo-date').textContent
  })

  ///////////////
  // 3.累計人数
  await page.waitForSelector('.DataCard:nth-child(4) > .DataView > .DataView-Inner > div > .DataSelector > button.DataSelector-Button:nth-child(2)', {
    visible: true
  })
  await page.focus('.DataCard:nth-child(4) > .DataView > .DataView-Inner > div > .DataSelector > button.DataSelector-Button:nth-child(2)');
  await page.click('.DataCard:nth-child(4) > .DataView > .DataView-Inner > div > .DataSelector > button.DataSelector-Button:nth-child(2)');

  const totalSummary = await page.evaluate(() => {
    return document.querySelector('.DataCard:nth-child(4) > .DataView > .DataView-Inner > .DataView-Header > .DataView-DataInfo > .DataView-DataInfo-summary').textContent
  })

  // 取得データの整形
  const totalNumberOfPositive = confirmContainText(totalSummary)

  // slackに通知する
  notifySlack(numberOfPositive, reseachDate, totalNumberOfPositive)

  await browser.close();
})();

// 取得した数値データの整形
// 例) 190人 or 190persons の表記ずれがあるので両方に対応してる
function confirmContainText(text) {
  if (text.includes('persons')) {
    return text.replace('persons', '').trim()
  }

  return text.replace('人', '').trim()
}

// slackに通知する
function notifySlack(text, date, total) {
  // http通信を実現してくれるライブラリ
  let request = new XMLHttpRequest()
  let url = process.env.SLACK_URL
  let data = JSON.stringify({
    'text': factoryText(text, date, total)
  });

  // args: methods, url, async(非同期か否か)
  request.open('POST', url, true)
  request.setRequestHeader('Content-Type', 'application/json')
  request.send(data)
}

// 送信メッセージの作成
function factoryText(text, date, total) {
  const message = `${date}です。 \n 陽性患者数: ${text}人 \n 累計: ${total}人 \n 詳細はこちらから > https://stopcovid19.metro.tokyo.lg.jp/`
  return message
}

// 日付フォーマッター
function dateToStr24HPad0(date, format) {

  if (!format) {
    // デフォルト値
    format = 'YYYY/MM/DD hh:mm:ss'
  }

  // フォーマット文字列内のキーワードを日付に置換する
  format = format.replace(/YYYY/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));

  return format;
}