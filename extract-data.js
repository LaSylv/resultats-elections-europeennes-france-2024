const fs = require('fs');
const {JSDOM} = require('jsdom');

const axios = require('axios');

async function downloadContent(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error downloading content:', error);
        return null;
    }
}

function csvToJson(csv) {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map(header => header.trim());

    return lines.slice(1).map(line => {
        const values = line.split(",").map(value => value.trim());
        let jsonObject = {};
        headers.forEach((header, index) => {
            jsonObject[header] = values[index] || null;
        });
        return jsonObject;
    });
}


// Function to read a file and convert CSV to JSON
 function readFileAndConvertToJson(filePath) {
    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }

        // Parse CSV data
        const json = csvToJson(data);
        const jsonDataOutput = []
        for (const commune of json) {
            console.log('Processing [' + commune.LIBELLE + ']')

            if(fs.existsSync('output/' + commune.COM + '.json')) {
                console.log('Skipped [' + commune.LIBELLE + ']')
                continue
            }
// Example usage
            const url = 'https://www.resultats-elections.interieur.gouv.fr/europeennes2024/ensemble_geographique/' + commune.REG + '/' + commune.DEP + '/' + commune.COM + '/index.html'; // Replace with your URL
            await downloadContent(url).then(content => {
                if (content) {
// Parse the HTML
                    const dom = new JSDOM(content);
                    const {document} = dom.window;

// Function to extract data from table rows
                    function extractDataFromRow(row) {
                        const cells = row.querySelectorAll('td');
                        return {
                            name: cells[0].textContent.trim(),
                            code: cells[1].textContent.trim(),
                            count: parseInt(cells[2].textContent.trim()),
                            percentage1: parseFloat(cells[3].textContent.trim().replace(',', '.')),
                            percentage2: parseFloat(cells[4].textContent.trim().replace(',', '.')),
                        };
                    }

// Extract data from each row in the main table
                    const mainTableRows = document.querySelector('table > tbody:nth-of-type(1)').querySelectorAll('tr');
                    const mainTableData = Array.from(mainTableRows).map(extractDataFromRow);

// Extract data from the summary table
                    const summaryTableRows = document.querySelectorAll('table')[1]
                        .querySelectorAll('tbody tr');
                    const summaryData = {};
                    summaryTableRows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        const key = cells[0].textContent.trim();
                        const value = cells[1].textContent.trim();
                        summaryData[key] = isNaN(parseFloat(value)) ? value : parseFloat(value.replace(',', '.'));
                    });

                    var newItem = {
                        mainTable: mainTableData, summaryTable: summaryData, commune
                    };
                    jsonDataOutput.push(newItem);

                    fs.writeFileSync('output/' + commune.COM + '.json', JSON.stringify(newItem, null, 2));
                    console.log('Processed [' + commune.LIBELLE + ']')


                }
            });

        }
        fs.writeFileSync('output.json', JSON.stringify(jsonDataOutput, null, 2), );
        console.log('JSON data has been written to output.json');

    });
}

readFileAndConvertToJson('communes.csv')