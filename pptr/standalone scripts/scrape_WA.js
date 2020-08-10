const fs = require('fs');
const puppeteer = require('puppeteer'); 

(async () => { 
    var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    var page = await browser.newPage();

    //input id to search
    const id = '123456';
    var url = 'https://professions.dol.wa.gov/s/license-lookup';

    //loops 10 times (max results on the page are 10)
    //nav to next page not done yet but will include this loop in a try catch, maybe looped
    //no natural increment in case of loading error -> retry

    //TODO: add page navigation in case of >10 results
    //TODO: add profession selection using drop-down list 
    var loadingAttempts1 = 0;
    var loadingAttempts2 = 0;
    var loadingAttempts3 = 0;
    const loadingAttemptsMax = 3;

    var j = 0;
    var entries = 1;
    var files = [];
    while (j < entries) {
        //phase 1 type in license id and navigate to general results
        try {
            //page nav and loading
            await page.goto(url, {
                waitUntil: 'domcontentloaded'
            });
            await page.waitForSelector('#main > div > div > div.slds-col--padded.contentRegion.comm-layout-column > div > div > div > div.screen-one > div:nth-child(4) > div > div > div:nth-child(2) > lightning-input > div', {timeout: 5000});
            await page.waitFor(1000 * (loadingAttempts1 + 1));

            //press tab (4) times to navigate to correct input box
            //note: workaround used because selector for id input field does not work
            for (var i = 0; i < 4; i++) {
                await page.keyboard.press('Tab', {delay: 100});
            }

            //enter id into input field
            await page.keyboard.type(id, {delay: 100});
            //await page.screenshot({path: '/tmp/WA_ss_' + j + '_a.png'});
            
            //nav and click 'Search' button
            await page.keyboard.press('Tab', {delay: 100});
            await page.keyboard.press('Enter', {delay: 100});
            await page.waitFor(1000 * (loadingAttempts1 + 1));
            
            //grab table element of search results (normal selector doesnt work /?)
            var element = await page.$x('//*[@id="data-table"]/div[2]/div/div/div/table');

        //most likely error will be loading failure (timeout / missing div)    
        } catch (error) {
            page.waitFor(500);
            //console.log(error);
            loadingAttempts1++;
            if (loadingAttempts1 >= loadingAttemptsMax) {
                await browser.close();
                process.exit();
            }
            continue;
        }
        //after successful navigation then reset nav attempts for phase 1
        loadingAttempts1 = 0;

        //phase 2 attempt to get to detailed page
        try {
            //get rows from table
            var tr = await element[0].$$('tr');
            //refresh number of entries in the table, if no entries in table then exit
            entries = tr.length - 1;
            if (entries == 1) {
                await browser.close();
                process.exit();
            }
            //go to row [j + 1] (based on loop number so we can scrape every detailed page)
            var th = await tr[j + 1].$$('th');
            //get column 0 from row and click link to detailed page
            await th[0].click();
            
            await page.waitFor(2000);
            await page.screenshot({path: '/tmp/WA_ss2.png'});
        //most likely error would be indexoutofbounds indicating completion of loop 
        } catch (error) {
            page.waitFor(500);
            //console.log(error);
            loadingAttempts2++;
            if (loadingAttempts2 >= loadingAttemptsMax) {
                await browser.close();
                process.exit();
            }
            //retry loop without increment
            continue;
        }
        //after successful navigation then reset nav attempts for phase 2
        loadingAttempts2 = 0;

        //phase 3 scrape data from detailed page
        try {
            var arr = await page.$$('.text-element');
            var file = {};
            //scrapes all key pair data from detailed page
            for (var k = 0; k < arr.length; k++) {
                var err = false;
                var txt = await arr[k].getProperty('textContent');
                var result = await txt.jsonValue();
                var results = result.split(':');

                if (results[0] == 'Address') {
                    //console.log('found address field');
                    //grab only top row of address element
                    element = await page.$x('//*[@id="main"]/div/div/div[2]/div/div/div/div[4]/div[3]/div[2]/div[7]/div[2]/div/text()[1]');
                    txt = await element[0].getProperty('textContent');
                    var address1 = await txt.jsonValue();
                    //console.log({address1});
                    //now grab entire address text
                    element = await page.$x('//*[@id="main"]/div/div/div[2]/div/div/div/div[4]/div[3]/div[2]/div[7]/div[2]/div');
                    txt = await element[0].getProperty('textContent');
                    var address2 = await txt.jsonValue();
                    //string processing to split addresses
                    address2 = address2.substring(address1.length);
                    address2a = address2.split('\n');
                    address2 = address2a[0].trim() + ' ' + address2a[1].trim();
                    result = 'Address:' + address1 + ' ' + address2;
                } else if (results[0] != undefined && results[0] != '') {
                    //sometimes hits 'cannot read property 'trim' of undefined
                    try {
                        result = results[0].trim() + ':' + results[1].trim();
                    } catch (error) {
                        //console.log('problem with trim on entry ' + j + 'on field ' + k, {result, results, error});
                        await browser.close();
                        process.exit();
                    }
                } else {
                    err = true;
                }
                if (!err) {
                    results = result.split(':');
                    file[results[0]] = results[1];
                }
            }
            //add json result to array
            var result = JSON.stringify(file, null, 2);
            files[j] = result;

        //possible errors: missing selector on detailed page
        } catch (error) {
            page.waitFor(500);
            console.log('error at phase 3 - loop ', j);
            console.log(error);
            loadingAttempts3++;
            if (loadingAttempts3 >= loadingAttemptsMax) {
                await browser.close();
            }
            //retry loop without increment
            continue;
            
        }
        //after successful scraping then reset nav attempts for phase 3
        loadingAttempts3 = 0;

        //after everything is successful then increment loop to scrape next row
        j++;

    }

    //return array of json results
    console.log(files);
    
    //close brower process
    await browser.close();

    //exit process
    process.exit();     

})();