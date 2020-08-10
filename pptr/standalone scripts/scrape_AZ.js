const fs = require('fs');
const puppeteer = require('puppeteer'); 

(async () => { 

    //launch chrome in headless mode without a user
    var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    var page = await browser.newPage();

    //license num to search
    var id = '181532';
    var url = 'https://roc.az.gov/search/node/' + id;
    
    //entire code wrapped in try-catch block, no retries attempted
    try {

        //navigate to the AZ license board page with id search
        await page.goto(url, {
            waitUntil: 'domcontentloaded'
        });
        
        //wait for page load, slight additional load needed for visuals to catch up
        await page.waitForSelector('div#contractorSearchResults', {timeout: 5000});
        await page.waitFor(1000);

        //get element with link to detailed page
        var element = await page.$('#contractorSearchResults > table > tbody > tr:nth-child(2) > td:nth-child(3) > a');

        //check if the link to new page matches id input
        var txt = await element.getProperty('textContent');
        var link = await txt.jsonValue();

        //if link matches
        if (link == id) {

            //grab href inside link
            var newUrl = await page.evaluate(e => e.href, element);

            //navigate to the detailed page
            await page.goto(newUrl);
                    
            //wait for page load, slight additional load needed for visuals to catch up
            await page.waitForSelector('div.formElement.formElementHalf', {timeout: 5000});
            await page.waitFor(1000);   

        //if link != id, prints out the id and link text and goes to bottom catch
        } else {
            throw 'incorrrect id found', '{link, id}';
        }

        //grabs data table from detailed page
        element = await page.$('#block-roc-salesforce-recent > div > div > div.licenseDetails > div:nth-child(3)');
        txt = await element.getProperty('textContent');
        var data = await txt.jsonValue();

        //splitting the data into an array
        data = data.split("\n");
        
        //storing data into variables
        var licenseStatus = data[7];
        var businessName = data[3];
        
        //address1 and address2 are compressed into 1 line, so string processing is done to split them
        var address = data[4];
        addresses1 = address.split(',');
        addresses2 = addresses1[addresses1.length - 2].split(' ');
        var address2 = addresses2[addresses2.length - 1].replace(/\d+/g, '') + ',' + addresses1[addresses1.length - 1];
        var address1 = address.substring(0, address.length - address2.length);

        //string processing to only get the phone number
        var phoneNumber = data[5].split(': ').pop();

        //only need classification so only grabbing one data line
        const element1 = await page.$('#block-roc-salesforce-recent > div > div > div.licenseDetails > div:nth-child(4) > a > strong');
        txt = await element1.getProperty('textContent');
        var classification = await txt.jsonValue();

        //create json file to return
        var file = {licenseStatus, classification, businessName, address1, address2, phoneNumber};

        //close brower process
        await browser.close();

        //print results in json format
        console.log(file);

        //exit
        process.exit();

    //most likely error: navigation to page failed, timeout error    
    } catch (error) {
        //error message
        console.log(error);
        await browser.close();
        process.exit();
    }

})();