const puppeteer = require("puppeteer");
const date = require("./helper/date");
const csv = require("./helper/csv");

const existChannelLists = require("./definitions/exist_channel_list");

/**
 * 新規channelスクレイピングする時に取得する
 */
(async () => {
  // open browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await scraping(page, existChannelLists);

  await browser.close();
})();

/**
 * 全チャンネルスクレイピングする
 * この関数を作らないと、非同期をforeachで回した時に`await is only valid in async function`エラーがでる
 * @param {*} page
 * @param {*} channelLists
 */
async function scraping(page, channelLists) {
  for (channel of channelLists) {
    await scrapingYoutube(page, channel.url);
    process.stdout.write('.')
  }
}

/**
 * yourtubeからデータを映画紹介をスクレピングする
 * @param {*} page
 * @param string channelUrl
 */
async function scrapingYoutube(page, channelUrl) {
  await page.goto(channelUrl, {
    waitUntil: "domcontentloaded",
    timeout: 0,
  });

  /////////////////////
  // 検索処理
  // ボタンアイコン押下
  const search_button_selector =
    "#tabsContent > .style-scope > .style-scope > #button > .style-scope";
  await page.waitForSelector(search_button_selector);
  await page.click(search_button_selector);

  // フィルター記述
  const search_field_selector =
    "#container > .input-wrapper > #labelAndInputContainer > #input-1 > .style-scope";
  await page.waitForSelector(search_field_selector);
  // 昨日の日付
  await page.type(search_field_selector, `after:${date.getExistScrapingDay("YYYY-MM-DD")}`);
  await page.keyboard.press("Enter");

  /////////////////////
  // 検索結果の動画一覧を取得
  await page.waitForSelector(
    "ytd-item-section-renderer.ytd-section-list-renderer:nth-child(1) > #contents"
  );

  await page.waitFor(3000);

  const data = await page.evaluate(() => {
    const elementCount = document.querySelectorAll(
      "ytd-item-section-renderer.ytd-section-list-renderer"
    ).length;
    const data = [];

    for (let i = 1; i <= elementCount; i++) {
      let text = document.querySelector(
        `ytd-item-section-renderer.ytd-section-list-renderer:nth-child(${i}) > #contents > ytd-video-renderer > #dismissable > .text-wrapper > #meta > #title-wrapper > h3 > a#video-title`
      );

      // nullで抜ける
      if (text === null) break;

      let href = "https://www.youtube.com/" + text.getAttribute("href").trim()
      let sql = [
        `INSERT INTO movies (title,title_for_search, youtube_url) VALUES ('${text.textContent.trim()}', '${text.textContent.trim()}','${href}');`
      ]

      data.push(sql);
    }

    return data;
  });

  const yesterday = await date.getYesterday('YYYY-MM-DD');
  await csv.outputCsv(data, yesterday);
}