const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function init(){
    const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    await page.setDefaultTimeout(120000);
    let listingLinks = await getListingLinks(page);

    let data = [];let i;
    for(i=0;i<listingLinks.length;i++){
        try {
            await delay(10000);
            await page.goto(listingLinks[i], { waitUntil: 'networkidle2' });
            data.push(await page.evaluate(() => {
                let op = {
                   amenities: "",
                   wifi: "",
                   furnished: "",
                   Heat: "",
                   Hydro: "",
                   Water: "",
                   pets: "",
                   airConditioning: "",
                   smoking: "",
                   outdoorSpace: "",
                   squareFootage: "",
                   parkingAvailability: "",
                   leasePeriod: "",
                   bedrooms: "",
                   bathrooms: "",
                   buildingType: "",
                   rent: "",
                   location: "",
                   laundry: "",
                   dishwasher: "",
                   fridge: "",
                };

                op.location = document.querySelector('[itemprop="address"]')?.innerText;
                op.location = op.location.replaceAll(',', ';');
                
                let featuresCard = document.querySelector('[class^="itemAttributeCards"]');
                let features = featuresCard?.querySelectorAll('li[class^="twoLinesAttribute"]');
                
                features.forEach((feature) => {
                    if(feature.querySelector('[class^="twoLinesLabel"]')?.innerText?.includes('Size (sqft)')){
                        op.squareFootage = feature.querySelector('[class^="twoLinesValue"]')?.innerText
                    }

                    if(feature.querySelector('[class^="twoLinesLabel"]')?.innerText?.includes('Parking Included')){
                        op.parkingAvailability = feature.querySelector('[class^="twoLinesValue"]')?.innerText
                    }

                    if(feature.querySelector('[class^="twoLinesLabel"]')?.innerText?.includes('Agreement Type')){
                        op.leasePeriod = feature.querySelector('[class^="twoLinesValue"]')?.innerText
                    }

                    if(feature.querySelector('[class^="twoLinesLabel"]')?.innerText?.includes('Furnished')){
                        op.furnished = feature.querySelector('[class^="twoLinesValue"]')?.innerText;
                    }

                    if(feature.querySelector('[class^="twoLinesLabel"]')?.innerText?.includes('Pet Friendly')){
                        op.pets = feature.querySelector('[class^="twoLinesValue"]')?.innerText;
                    }

                    if(feature.querySelector('[class^="twoLinesLabel"]')?.innerText?.includes('Smoking Permitted')){
                        op.smoking = feature.querySelector('[class^="twoLinesValue"]')?.innerText;
                    }

                    if(feature.querySelector('[class^="twoLinesLabel"]')?.innerText?.includes('Air Conditioning')){
                        op.airConditioning = feature.querySelector('[class^="twoLinesValue"]')?.innerText;
                    }

                });

                let amens = document.querySelectorAll('[class^="attributeGroupContainer"]');
                
                amens.forEach((amen) => {
                    if(amen.querySelector('[class^="attributeGroupTitle"]')?.innerText?.includes('Utilities Included')){
                        amen.querySelectorAll('[class^="groupItem"] > svg')?.forEach((ut) => {
                            op[ut.getAttribute('aria-label').split(':')[1].trim()] = ut.getAttribute('aria-label').split(':')[0];
                        })
                    }

                    if(amen.querySelector('[class^="attributeGroupTitle"]')?.innerText?.includes('Appliances')){
                        amen.querySelectorAll('[class^="groupItem"]')?.forEach((ut) => {
                            if(ut?.innerText.includes('Laundry')){
                                op.laundry = ut?.innerText
                            }
                            if(ut?.innerText.includes('Dishwasher')){
                                op.dishwasher = ut?.innerText
                            }
                            if(ut?.innerText.includes('Fridge')){
                                op.fridge = ut?.innerText
                            }
                        })
                    }

                    if(amen.querySelector('[class^="attributeGroupTitle"]')?.innerText?.includes('Wi-Fi and More')){
                        amen.querySelectorAll('[class^="groupItem"]')?.forEach((ut) => {
                            op.wifi = op.wifi.concat(ut?.innerText || '', ';')
                        })
                    }

                    if(amen.querySelector('[class^="attributeGroupTitle"]')?.innerText?.includes('Outdoor Space')){
                        amen.querySelectorAll('[class^="groupItem"]')?.forEach((ut) => {
                            op.outdoorSpace = op.outdoorSpace.concat(ut?.innerText || '', ';')
                        })
                    }

                    if(amen.querySelector('[class^="attributeGroupTitle"]')?.innerText?.includes('Amenities')){
                        amen.querySelectorAll('li[class^="groupItem"]')?.forEach((ut) => {
                            op.amenities = op.amenities.concat(ut?.innerText || '', ';')
                        })
                    }

                });
                let pointersCard = document.querySelector('[class^="unitRow"]');
                let pointers = pointersCard?.querySelectorAll('[class^="noLabelValue"]');

                pointers.forEach((pointer) => {
                    if(pointer?.innerText?.includes('Bedrooms: ')){
                        op.bedrooms = pointer?.innerText?.replace('Bedrooms: ', '')
                    } else if(pointer?.innerText?.includes('Bathrooms: ')){
                        op.bathrooms = pointer?.innerText?.replace('Bathrooms: ', '')
                    } else if (pointer?.innerText){
                        op.buildingType = pointer?.innerText
                    }
                });
                op.rent = document.querySelector('[class^="priceWrapper"]')?.querySelector('span')?.innerText.replace(',', '');
                return op;
                //data.push(op);
            }));
            console.log(i);
        } catch(err){
            console.log(err)
            continue;
        }
    }
    browser.close();
    console.log(data)
    arrayToCSV(data)
}

async function getListingLinks(page) {
    let listingLinks = [];
    await page.goto('https://www.kijiji.ca/b-apartments-condos/city-of-halifax/c37l1700321', { waitUntil: 'networkidle2' });
    

    let nextUrl = await page.$eval('[data-testid="pagination-next-link"] > a', node => node.href);
    
    while(nextUrl){
        console.log(nextUrl)
        try{
            listingLinks = [...listingLinks, ...(await page.$$eval('[data-testid="listing-link"]', e => e.map(a => a.href)))]
            await page.goto(nextUrl, { waitUntil: 'networkidle2' });
            await delay(10000)
            if(await page.$('[data-testid="pagination-next-link"] > a')){
                nextUrl = await page.$eval('[data-testid="pagination-next-link"] > a', node => node.href);
            } else {
                listingLinks = [...listingLinks, ...(await page.$$eval('[data-testid="listing-link"]', e => e.map(a => a.href)))]
                nextUrl = '';
            }
        } catch(err){
            break;
        }
    }
    console.log(listingLinks)
    return listingLinks;
}

function arrayToCSV(data, filename = 'kijiji.csv') {
    try {
        const csvRows = [];
        const headers = Object.keys(data[0]);
        csvRows.push(headers.join(','));

        data.forEach(row => {
        const csvRow = headers.map(header => {
            const value = row[header];
            return value === undefined || value === null ? '-' : String(value).replace(/"/g, '""').replace(',', ';'); // Escape double quotes
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