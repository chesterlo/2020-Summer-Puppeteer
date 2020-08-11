'use strict';

const express = require('express');
const fs = require('fs');
const puppeteer = require('puppeteer');
// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
var app = express();
app.use(express.json());

//commented code can be found on jira or in original standalone scripts

app.post('/pdf/', (req, res) => {
	(async () => { 
		var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
		var page = await browser.newPage();

		var css = fs.readFileSync(req.body.css, 'utf8');
		var header = fs.readFileSync(req.body.header, 'utf8');
		var footer = fs.readFileSync(req.body.footer, 'utf8');
		var body = fs.readFileSync(req.body.body, 'utf8');

		await page.setContent(body, {waitUntil: 'networkidle0'}); 
		await page.addStyleTag({content: css});
		await page.pdf({path: '/tmp/outputPDF.pdf', format: 'Letter',
			displayHeaderFooter: true, headerTemplate: header, footerTemplate: footer,
			margin: {top: '.75in', bottom: '.75in', left: '.25in', right: '.25in'}},); 
		await browser.close(); 
		
		var buf = fs.readFileSync('/tmp/outputPDF.pdf');
		var b64pdf = buf.toString('base64');
	
		return res.send(b64pdf);
		
	})();
});

app.post('/scrape_AZ/', (req, res) => {
	(async () => { 
		var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
		var page = await browser.newPage();
		var id = req.body.id;
		var url = 'https://roc.az.gov/search/node/' + id;

		try {
			await page.goto(url, {
				waitUntil: 'domcontentloaded'
			});
			await page.waitForSelector('div#contractorSearchResults', {timeout: 5000});
			await page.waitFor(1000);
	
			var elementL = await page.$('#contractorSearchResults > table > tbody > tr:nth-child(2) > td:nth-child(3) > a');
			var txt = await elementL.getProperty('textContent');
			var link = await txt.jsonValue();
	
			if (link == id) {
				var newUrl = await page.evaluate(element => element.href, elementL);
				await page.goto(newUrl);
				await page.waitForSelector('div.formElement.formElementHalf', {timeout: 5000});
				await page.waitFor(1000);   
			} else {
				throw 'incorrrect id found', '{link, id}';
			}

			var element0 = await page.$('#block-roc-salesforce-recent > div > div > div.licenseDetails > div:nth-child(3)');
			txt = await element0.getProperty('textContent');
			var data = await txt.jsonValue();
			data = data.split("\n");
			
			var licenseStatus = data[7];
			var businessName = data[3];
			
			var address = data[4];
			var addresses1 = address.split(',');
			var addresses2 = addresses1[addresses1.length - 2].split(' ');
			var address2 = addresses2[addresses2.length - 1].replace(/\d+/g, '') + ',' + addresses1[addresses1.length - 1];
			var address1 = address.substring(0, address.length - address2.length);
	
			var phoneNumber = data[5].split(': ').pop();
	
			const element1 = await page.$('#block-roc-salesforce-recent > div > div > div.licenseDetails > div:nth-child(4) > a > strong');
			txt = await element1.getProperty('textContent');
			var classification = await txt.jsonValue();

			var file = {licenseStatus, classification, businessName, address1, address2, phoneNumber};
	
			await browser.close();

			return res.send(file);

		} catch (error) {
			console.log(error);
			await browser.close();
		}
	})();
});

app.post('/scrape_CA/', (req, res) => {
  	(async () => { 
		var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
		var page = await browser.newPage();
		var id = req.body.id;
		var url = 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=' + id;

		await page.goto(url, {
			waitUntil: 'domcontentloaded'
		});
		await page.waitForSelector('td#MainContent_Status', {timeout: 5000});
		await page.waitFor(1000);

		var element = await page.$x('//*[@id="MainContent_Status"]/span/strong');
		var txt = await element[0].getProperty('textContent');
		var licenseStatus = await txt.jsonValue();

		var element1 = [];
		var classification = [];
		try {
			[element1] = await page.$x('//*[@id="MainContent_ClassCellTable"]/a');
			txt = await element1.getProperty('textContent');
			classification[0] = await txt.jsonValue(); 
		} catch {
			try {
				var num = 1;
				var inputString;
				while (true) {
					inputString = "//*[@id=\"MainContent_ClassCellTable\"]/ul/li[" + num.toString() + "]/a";
					[element1] = await page.$x(inputString);
					txt = await element1.getProperty('textContent');
					classification[num - 1] = await txt.jsonValue();
					num++;
				}
			} catch {}
		}
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
		
		var file = {licenseStatus, classification, businessName, address1, address2, phoneNumber};

		await browser.close();

		return res.send(file);

	})();
});

app.post('/scrape_OR/', (req, res) => {
	(async () => { 
		var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
		var page = await browser.newPage();
		var id = req.body.id;
		var url = 'http://search.ccb.state.or.us/search/search_result.aspx?id=' + id;
	
		try {
			await page.goto(url, {
				waitUntil: 'domcontentloaded'
			});
			await page.waitForSelector('div#pagecontent', {timeout: 5000});
			await page.waitFor(1000);
			
			for (var i = 0; i < 10; i++) {
				try {
					var element = await page.$('#pagecontent > div > table:nth-child(2) > tbody > tr:nth-child(4) > td > a');
					var txt = await element.getProperty('textContent');
					var text = await txt.jsonValue();

					if (text == 'Learn more about this business') {
						await page.evaluate(e => e.click(), element);
						await page.waitFor(2000);
						url = await page.mainFrame().url();
						if (url == 'http://search.ccb.state.or.us/search/business_details.aspx') {
							break;
						}
					}

					await page.goBack({waitUntil: 'domcontentloaded', timeout: 5000});
					await page.waitForSelector('div#pagecontent', {timeout: 5000});
					await page.waitFor(500 * i);
				} catch (error) {
					await page.goto(url, {
						waitUntil: 'domcontentloaded'
					});
					await page.waitForSelector('div#pagecontent', {timeout: 5000});
					await page.waitFor(1000);
				}
			}

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
				var address1 = await txt.jsonValue();
			} catch {}
			try {
				element = await page.$('#MainContent_phonelabel');
				txt = await element.getProperty('textContent');
				var phoneNumber = await txt.jsonValue();
			} catch {}
		
			var file = {licenseStatus, classification, businessName, address1, phoneNumber};
	
			await browser.close();

			return res.send(file);
	
		} catch (error) {
			console.error(error);
			await browser.close();
		}
	})();
});

app.post('/scrape_WA/', (req, res) => {
	(async () => { 
		var browser = await puppeteer.launch({ args: ['--no-sandbox'] });
		var page = await browser.newPage();
	
		const id = req.body.id;
		var url = 'https://professions.dol.wa.gov/s/license-lookup';
	
		var loadingAttempts1 = 0;
		var loadingAttempts2 = 0;
		var loadingAttempts3 = 0;
		const loadingAttemptsMax = 3;
	
		var j = 0;
		var entries = 1;
		var files = [];
		while (j < entries) {
			try {
				await page.goto(url, {
					waitUntil: 'domcontentloaded'
				});
				await page.waitForSelector('#main > div > div > div.slds-col--padded.contentRegion.comm-layout-column > div > div > div > div.screen-one > div:nth-child(4) > div > div > div:nth-child(2) > lightning-input > div', {timeout: 5000});
				await page.waitFor(1000 * (loadingAttempts1 + 1));

				for (var i = 0; i < 4; i++) {
					await page.keyboard.press('Tab', {delay: 100});
				}
				await page.keyboard.type(id, {delay: 100});
				await page.keyboard.press('Tab', {delay: 100});
				await page.keyboard.press('Enter', {delay: 100});
				await page.waitFor(1000 * (loadingAttempts1 + 1));

				var element = await page.$x('//*[@id="data-table"]/div[2]/div/div/div/table');
			} catch (error) {
				page.waitFor(500);
				loadingAttempts1++;
				if (loadingAttempts1 >= loadingAttemptsMax) {
					await browser.close();
					process.exit();
				}
				continue;
			}
			loadingAttempts1 = 0;
	
			try {
				var tr = await element[0].$$('tr');
				entries = tr.length - 1;
				if (entries == 1) {
					await browser.close();
					process.exit();
				}
				var th = await tr[j + 1].$$('th');
				await th[0].click();
				
				await page.waitFor(2000);
				await page.screenshot({path: '/tmp/WA_ss2.png'});
			} catch (error) {
				page.waitFor(500);
				loadingAttempts2++;
				if (loadingAttempts2 >= loadingAttemptsMax) {
					await browser.close();
				}
				continue;
			}
			loadingAttempts2 = 0;
	
			try {
				var arr = await page.$$('.text-element');
				var file = {};

				for (var k = 0; k < arr.length; k++) {
					var err = false;
					var txt = await arr[k].getProperty('textContent');
					var result = await txt.jsonValue();
					var results = result.split(':');

					if (results[0] == 'Address') {
						element = await page.$x('//*[@id="main"]/div/div/div[2]/div/div/div/div[4]/div[3]/div[2]/div[7]/div[2]/div/text()[1]');
						txt = await element[0].getProperty('textContent');
						var address1 = await txt.jsonValue();

						element = await page.$x('//*[@id="main"]/div/div/div[2]/div/div/div/div[4]/div[3]/div[2]/div[7]/div[2]/div');
						txt = await element[0].getProperty('textContent');
						var address2 = await txt.jsonValue();

						address2 = address2.substring(address1.length);
						address2a = address2.split('\n');
						address2 = address2a[0].trim() + ' ' + address2a[1].trim();
						result = 'Address:' + address1 + ' ' + address2;
					} else if (results[0] != undefined && results[0] != '') {
						try {
							result = results[0].trim() + ':' + results[1].trim();
						} catch (error) {
							await browser.close();
						}
					} else {
						err = true;
					}

					if (!err) {
						results = result.split(':');
						file[results[0]] = results[1];
					}
				}
				var result = JSON.stringify(file, null, 2);
				files[j] = result;
	
			} catch (error) {
				page.waitFor(500);
				loadingAttempts3++;
				if (loadingAttempts3 >= loadingAttemptsMax) {
					await browser.close();
				}
				continue;
			}
			loadingAttempts3 = 0;
			j++;

		}
			
		await browser.close();

		return res.send(files);
	
	})();
});

app.get('/', (req, res) => {
	return res.send('Received a GET HTTP method');
});

app.post('/', (req, res) => {
	return res.send('Received a POST HTTP method');
});

app.put('/', (req, res) => {
  	return res.send('Received a PUT HTTP method');
});
 
app.delete('/', (req, res) => {
  	return res.send('Received a DELETE HTTP method');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
