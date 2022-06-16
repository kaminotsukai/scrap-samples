import puppeteer from 'puppeteer';
import * as fs from 'fs'
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';

async function ScrapCompanyDetailURLs() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://b2b-ch.infomart.co.jp/company/search/list.page?1492&chi=12&chg=03&chm=0&chm=1&chm=2&chm=3&chm=8');
    await page.waitForSelector('#next')

    const limit = 20
    let maxNum = await page.evaluate(() => {
        return document.querySelector("#maxNum").textContent
    });
    const maxPages = maxNum / limit + 1
    
    for (let i = 1; i <= maxPages; i++) {
        console.log(`${i}ページ目のスクレイピングを開始します`)
        let urls = await page.evaluate(() => {
            const urls = []
            companyBlocks = document.querySelectorAll("section > div")
            companyBlocks.forEach(block => {
                urls.push({"url": block.querySelector("#lnkCompanyName").href})
            });
            return urls
        });
        console.log(`${urls.length}件のURLが取得できました。ファイルへ書き込みます`)
        fs.appendFileSync('company-detail-urls.csv', stringify(urls, {header: false}));

        console.log(`ファイル書き込み完了しました。次のページへ遷移します`)
        await page.click("#next")
        await page.waitForSelector('#next')
    }

    await browser.close();
}

async function ScrapCompanyDetail() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const file = fs.readFileSync("company-detail-urls.csv");
    const urls = parse(file);

    console.log(`${urls.length}件のデータを取得します`)
    for (let i = 1; i <= urls.length; i++) {
        await page.goto(urls[i][0]);
        await page.waitForSelector('#lblCompanyName')

        let company = await page.evaluate(() => {
            companyName = document.querySelector("#lblCompanyName").textContent
            hpURL = document.querySelector(".co-detail-tbl > div:nth-child(4) > .co-detail-tbl-td > a").href
            return [{ name: companyName, url: hpURL }]
        });

        console.log(`${i}件目の企業データをファイルに書き込み`)
        fs.appendFileSync('company-info.csv', stringify(company, {header: false}));
    }
}

// ScrapCompanyDetail()
