const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function init(){
    const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    await page.goto('https://rentals.ca/halifax', { waitUntil: 'networkidle2' });
    let response = await page.evaluate(async () => {
        return await fetch('https://rentals.ca/phoenix/api/v1.0.2/listings?details=mid1&suppress-pagination=1&limit=500&obj_path=halifax').then((r) => r.json())
    });
    let listings = response.data.listings;
    let listingLinks = response.data.listings.map(l => l.url);
    let data = [];
    for(i=0;i<listingLinks.length;i++){
        await page.goto(listingLinks[i], { waitUntil: 'networkidle2' });
        //await delay(10000);


        data.push(...(await page.evaluate((address, buildingType) => {
            let ops = []
            let floorGroups = document.querySelectorAll('[class^="floor-plan-group"]');
            let pop = {
                airConditioning: "",
                balcony: "",
                laundry: "",
                dishwasher: "",
                heat: "",
                water: "",
                hydro: "",
                wifi: "",
                pets: "",
                smoking: "",
                fridge: "",
                parkingAvailability: "",
                furnished: ""
            }

            let parkingAvailability, leasePeriod;
            let features = document.querySelectorAll('[class="listing-highlighted-info__item"]');
            let amens = document.querySelectorAll('[class="listing-features-and-amenities-desktop__content"] li');
            let utils = document.querySelectorAll('[class="listing-utilities"] > li');
            
            amens.forEach((amen) => {
                if(amen?.innerText?.toLowerCase().includes('parking')){
                    pop.parkingAvailability = amen?.innerText;
                }
                if(amen?.innerText?.includes('Air Conditioning')){
                    pop.airConditioning = amen?.innerText;
                }
                if(amen?.innerText?.includes('Balcony')){
                    pop.balcony = amen?.innerText;
                }
                if(amen?.innerText?.includes('Dishwasher')){
                    pop.dishwasher = amen?.innerText;
                }
                if(amen?.innerText?.includes('Washer') || amen?.innerText?.includes('Dryer') || amen?.innerText?.includes('Laundry')){
                    pop.laundry = pop.laundry + amen?.innerText;
                }
                if(amen?.innerText?.includes('Fridge')){
                    pop.dishwasher = amen?.innerText;
                }
                if(amen?.innerText?.includes('Fridge')){
                    pop.dishwasher = amen?.innerText;
                }
                if(amen?.innerText?.includes('Pet')){
                    pop.pets = amen?.innerText;
                }
                if(amen?.innerText?.includes('Smok')){
                    pop.smoking = amen?.innerText;
                }
                if(amen?.innerText?.includes('Furn')){
                    pop.furnished = amen?.innerText;
                }
            });

            utils.forEach((util) => {
                if(util?.innerText?.includes('Water')){
                    pop.water = util?.innerText?.trim();
                }
                if(util?.innerText?.includes('Hydro')){
                    pop.hydro = util?.innerText?.trim();
                }
                if(util?.innerText?.includes('Heat')){
                    pop.heat = util?.innerText?.trim();
                }
                if(util?.innerText?.includes('Cable') || util?.innerText?.includes('Internet') || util?.innerText?.includes('TV')){
                    pop.wifi = util?.innerText?.trim();
                }
            });

            features.forEach((f) => {
                if(f.querySelector('h4')?.innerText === 'Parking Spots'){
                    parkingAvailability = f.querySelector('p')?.innerText;
                }
                if(f.querySelector('h4')?.innerText === 'Lease Term'){
                    leasePeriod = f.querySelector('p')?.innerText;
                }
            });
            floorGroups && floorGroups.forEach((floor) => {
                let apartments = floor.querySelectorAll('[class^="unit-details"]');
                //console.log(apartments);
                
                apartments && apartments.forEach(apartment => {
                    let op = {
                        ...pop,
                        bedrooms: "",
                        rent: "",
                        bathrooms: "",
                        squareFootage: "",
                        parkingAvailability: "",
                        leasePeriod: "",
                    };
                    op.location = address;
                    op.buildingType = buildingType;
                    op.bedrooms = apartment.getAttribute('beds-count');
                    op.rent = apartment.querySelector('[class="unit-details__infos--price"]')?.innerText.replace('\n', ''). trim().replace(',', '');
                    op.bathrooms = apartment.querySelector('[class="unit-details__infos--baths"]')?.innerText.replace('  Bath', '').replace('\n', '').trim().replace(',', '');
                    op.squareFootage = apartment.querySelector('[class="unit-details__infos--dimensions"]')?.innerText.replace('\n', ''). trim().replace(',', '');
                    if(parkingAvailability && !parkingAvailability.includes('No Info')){
                        op.parkingAvailability = parkingAvailability.replace('\n', ''). trim().replace(',');
                    }
                    op.leasePeriod = leasePeriod?.replace('\n', ''). trim().replace(',', '');
                    ops = [...ops, op];
                })
            })
            return ops;
        }, `${listings[i].address1 || ''} ${listings[i].address2 || ''} ${listings[i].postal_code}`, listings[i].property_type)));
        console.log(i)
    }
    browser.close();
    arrayToCSV(data);
}

function arrayToCSV(data, filename = 'rentalsca.csv') {
    try {
        const csvRows = [];
        const headers = Object.keys(data[0]);
        csvRows.push(headers.join(','));

        
        data.forEach(row => {
            let isClean = true;
            const csvRow = headers.map(header => {
                const value = row[header];
                if( value === undefined || value === null){
                    isClean = false;
                }
                return value === undefined || value === null ? '' : String(value).replace(/"/g, '""').replaceAll('\n', '').trim(); // Escape double quotes
            }).join(',');
            if(isClean)
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