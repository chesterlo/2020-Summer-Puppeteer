const fs = require('fs');
const puppeteer = require('puppeteer'); 

(async () => { 
    var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    var page = await browser.newPage();

    //input id to search, will throw error if license with id doesnt actually exist
    const id = '184904';
    var url = 'http://search.ccb.state.or.us/search/search_result.aspx?id=' + id;

    try {
        //note: oregon license search has recaptcha so timeout error may be from captcha 
        //  popup, check screenshot logs for confirmation
  
        //page nav and loading
        await page.goto(url, {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForSelector('div#pagecontent', {timeout: 5000});
        await page.waitFor(1000);
        
        //loop checks if we reached correct page and if not we go back and try again, 
        //  this works around recaptcha only popping up sometimes by spam reloading until 
        //  it doesnt give a captcha
        for (var i = 0; i < 10; i++) {
            try {

                //scrape link to next page
                var element = await page.$('#pagecontent > div > table:nth-child(2) > tbody > tr:nth-child(4) > td > a');
                var txt = await element.getProperty('textContent');
                var text = await txt.jsonValue();

                //check if link is correct
                if (text == 'Learn more about this business') {
                    
                    //click link and check url
                    await page.evaluate(e => e.click(), element);
                    await page.waitFor(2000);
                    url = await page.mainFrame().url();

                    //if right url, exit loop and go to scraping
                    if (url == 'http://search.ccb.state.or.us/search/business_details.aspx') {
                        break;
                    }
                }
                
                //if something was wrong, such as link going to
                //  'http://search.ccb.state.or.us/search/default.aspx'
                //  or wrong link grabbed, go back to previous page
                //in the event that going back will go to about:blank, the 
                //  next loop will error and manually redirect to the correct url
                //the reason that we don't just go to the url every time is that pressing 
                //  the back arrow increases the chances of getting the detailed page url 
                //(?) not sure why this is the case or what causes the redirect to the default
                //  page instead of the detailed page all the time  
                await page.goBack({waitUntil: 'domcontentloaded', timeout: 5000});
                //wait for page load
                await page.waitForSelector('div#pagecontent', {timeout: 5000});
                await page.waitFor(500 * i);

            //error: No node found for selector: 'selector here' happens like 1/4 the time 
            // and im not sure why, if it throws this error, manually redirect to orignal 
            } catch (error) {
                //redirect to url with id 
                await page.goto(url, {
                    waitUntil: 'domcontentloaded'
                });
                await page.waitForSelector('div#pagecontent', {timeout: 5000});
                await page.waitFor(1000);
            }
        }
        
        //scrape page for data, OR doesnt have enough address data for address2, each has its 
        //  own try-catch so if one field is missing, it will still attempt to grab all the others
        try {
            element = await page.$('#MainContent_licensestatuslabel');
            txt = await element.getProperty('textContent');
            var licenseStatus = await txt.jsonValue();
        } catch {}
        try {
            element = await page.$('#MainContent_endorsementlabel');
            txt = await element.getProperty('textContent');
            var classification = await txt.jsonValue();
        } catch {}
        try {
            element = await page.$('#MainContent_contractornamelabel');
            txt = await element.getProperty('textContent');
            var businessName = await txt.jsonValue();
        } catch {}
        try {
            element = await page.$('#MainContent_addresslabel');
            txt = await element.getProperty('textContent');
            var address = await txt.jsonValue();
        } catch {}
        try {
            element = await page.$('#MainContent_phonelabel');
            txt = await element.getProperty('textContent');
            var phoneNumber = await txt.jsonValue();
        } catch {}
    
        //create json file to return
        var file = {licenseStatus, classification, businessName, address, phoneNumber};

        //close brower process
        await browser.close();

        //print results in json format
        console.log(file);

        //exit process
        process.exit();

    //most likely error will be navigation error or license not existing or repeated captcha
    } catch (error) {
        console.error(error);
        await browser.close();
        process.exit();
    }

})();
