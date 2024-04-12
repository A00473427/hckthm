const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function init(){
    const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    await page.setDefaultTimeout(120000);
    let listingLinks = await getListingLinks(page);
    // console.log(listingLinks)
    let data = [];let i;
    for(i=0;i<listingLinks.length;i++){
        try {
            //await delay(10000);
            await page.goto(listingLinks[i], { waitUntil: 'networkidle2' });
            data.push(await page.evaluate(() => {
                let op = {};

                op.location = document.querySelector('.propertyAddressRow')?.innerText.split('\n')[0]
                let features = document.querySelectorAll('[class="priceBedRangeInfoInnerContainer"]')

                features.forEach((feature) => {
                    if(feature?.querySelector(".rentInfoLabel")?.innerText === 'Bedrooms'){
                        op.bedrooms = feature?.querySelector(".rentInfoDetail")?.innerText
                    } else if(feature?.querySelector(".rentInfoLabel")?.innerText === 'Bathrooms'){
                        op.bathrooms = feature?.querySelector(".rentInfoDetail")?.innerText
                    } else if (feature?.querySelector(".rentInfoLabel")?.innerText === 'Monthly Rent'){
                        op.rent = feature?.querySelector(".rentInfoDetail")?.innerText
                    } else if (feature?.querySelector(".rentInfoLabel")?.innerText === 'Square Feet') {
                        op.squareFt = feature?.querySelector(".rentInfoDetail")?.innerText
                    }
                });
                return op;
            }));
            console.log(data);
        } catch(err){
            continue;
        }
    }
    browser.close();
    arrayToCSV(data)
}

async function getListingLinks(page) {
    let listingLinks = [];
    //await page.goto('https://www.apartments.com/halifax-ns/', { waitUntil: 'networkidle2' });
    
    let nextPage = true;
    let currentPage = 1;
    let url = 'https://www.apartments.com/halifax-ns/';

    await page.goto(url, { waitUntil: 'networkidle2' });
    while(currentPage < 3){
        listingLinks = [...listingLinks, ...(await page.$$eval('article[data-listingid]', e => e.map(a => a.getAttribute('data-url'))))]
        currentPage++;
        url = `${url}${currentPage}/`
        await page.goto(url, { waitUntil: 'networkidle2' });
        
    }
    
    return listingLinks;
}

function arrayToCSV(data, filename = 'apartments.csv') {
    try {
        const csvRows = [];
        const headers = Object.keys(data[0]);
        csvRows.push(headers.join(','));

        data.forEach(row => {
        const csvRow = headers.map(header => {
            const value = row[header];
            return value === undefined || value === null ? '' : String(value).replace(/"/g, '""'); // Escape double quotes
        }).join(',');
        csvRows.push(csvRow);
        });

        fs.writeFileSync(filename, csvRows.join('\n'));
        console.log(`CSV file created successfully: ${filename}`);
    } catch (error) {
        console.error('Error creating CSV file:', error);   
    }
}

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

init();