const fs = require('fs');
const puppeteer = require('puppeteer'); 

(async () => { 
    //launch chrome in headless mode without a user
    var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    var page = await browser.newPage();

    //license num to search
    var id = '899998';
    var url = 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=' + id;

    //go to the CA license board url with id appended
    await page.goto(url, {
        waitUntil: 'domcontentloaded'
    });

    //wait for page load, slight additional load needed for visuals to catch up
    await page.waitForSelector('td#MainContent_Status', {timeout: 5000});
    await page.waitFor(1000);

    //scrape page data 
    var element = await page.$x('//*[@id="MainContent_Status"]/span/strong');
    var txt = await element[0].getProperty('textContent');
    var licenseStatus = await txt.jsonValue();

    //multi layered try-catch block needed for classification, as some companies have multiple
    //  classifications, which changes element selectors
    var element1 = [];
    var classification = [];
    //case for only one classification
    try {
        [element1] = await page.$x('//*[@id="MainContent_ClassCellTable"]/a');
        txt = await element1.getProperty('textContent');
        classification[0] = await txt.jsonValue(); 
    } catch {
        try {
            var num = 1;
            var inputString;
            //loop changes selectors each loop and runs until no more classifications are found
            while (true) {
                inputString = "//*[@id=\"MainContent_ClassCellTable\"]/ul/li[" + num.toString() + "]/a";
                [element1] = await page.$x(inputString);
                txt = await element1.getProperty('textContent');
                classification[num - 1] = await txt.jsonValue();
                num++;
            }
        } catch {}
    }

    //scrape rest of elements, each has its own try-catch so if one field is missing, it 
    // will still attempt to grab all the others
    try {
        element = await page.$x('//*[@id="MainContent_BusInfo"]/text()[1]');
        txt = await element[0].getProperty('textContent');
        var businessName = await txt.jsonValue();
    } catch {}
    try {
        element = await page.$x('//*[@id="MainContent_BusInfo"]/text()[2]');
        txt = await element[0].getProperty('textContent');
        var address1 = await txt.jsonValue();
    } catch {}
    try {
        element = await page.$x('//*[@id="MainContent_BusInfo"]/text()[3]');
        txt = await element[0].getProperty('textContent');
        var address2 = await txt.jsonValue();
    } catch {}
    try {
        element = await page.$x('//*[@id="MainContent_BusInfo"]/text()[4]');
        txt = await element[0].getProperty('textContent');
        var phoneNumber = await txt.jsonValue();
        phoneNumber = phoneNumber.split(":").pop();
    } catch {}
    
    //create json file to return
    var file = {licenseStatus, classification, businessName, address1, address2, phoneNumber};

    //close brower process
    await browser.close();

    //print results in json format
    console.log(file);

    //exit process
    process.exit();

})();