```javascript
const SPREADSHEET_ID = "1E4yKKlvwMpPxiM_hL8ZyV-csz_poxcNPkYSLL8fRJXM";

const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

const logoUrl = "logo.png";

let currentViewMonth = String(new Date().getMonth() + 1).padStart(2, '0');


function getSheetUrl(monthNumber) {
    const sheetName = monthNames[parseInt(monthNumber, 10) - 1];

    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}


function parseCSVLine(line) {
    const result = [];
    let cur = "";
    let inQuote = false;

    const sep = line.includes(';') ? ';' : ',';

    for (let i = 0; i < line.length; i++) {
        let char = line[i];

        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        }

        else if (char === sep && !inQuote) {
            result.push(cur.trim());
            cur = "";
        }

        else {
            cur += char;
        }
    }

    result.push(cur.trim());

    return result.map(cell =>
        cell.replace(/^"(.*)"$/, '$1')
    );
}


async function loadData() {

    const url = getSheetUrl(currentViewMonth);

    try {

        const res = await fetch(url, {
            cache: "no-store"
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const rawData = await res.text();

        const rows = rawData
            .split(/\r?\n/)
            .filter(line => line.trim() !== "")
            .map(parseCSVLine);


        if (!rows.length) {
            throw new Error("Arkusz nie zawiera danych.");
        }


        const now = new Date();

        const isAlarmTime =
            (now.getHours() > 15) ||
            (now.getHours() === 15 && now.getMinutes() >= 30);


        const todayCSV =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;


        const realMonth =
            String(now.getMonth() + 1).padStart(2, '0');


        let html = "<table>";


        html += `
            <colgroup>
                <col style="width: 100px;">
                <col style="width: 130px;">
                <col style="width: auto;">
                <col style="width: auto;">
                <col style="width: auto;">
                <col style="width: auto;">
            </colgroup>
        `;


        let weekCounter = 0;


        rows.forEach((row, i) => {


            if (
                i > 1 &&
                row[0] &&
                row[0].toLowerCase().includes("poniedziałek")
            ) {
                weekCounter++;
            }


            const weekClass =
                weekCounter % 2 === 0
                    ? "week-even"
                    : "week-odd";


            const isToday =
                row[1] &&
                row[1].trim() === todayCSV;


            const todayRowClass =
                isToday ? " today-row" : "";


            html += `<tr class="${weekClass}${todayRowClass}">`;


            row.forEach((cell, j) => {

                if (j > 5) return;


                /*
                 * PIERWSZY WIERSZ
                 *
                 * Logo zajmuje tylko pierwszy wiersz.
                 * colspan="2" oznacza szerokość kolumn Dzień + Data.
                 */
                if (i === 0) {

                    if (j === 0) {

                        html += `
                            <th
                                class="logo-space"
                                colspan="2"
                                id="main-logo-container">
                            </th>
                        `;
                    }

                    else if (j > 1) {

                        const nameColors = [
                            "",
                            "",
                            "#38bdf8",
                            "#818cf8",
                            "#fbbf24",
                            "#f472b6"
                        ];


                        html += `
                            <th
                                style="
                                    color: ${nameColors[j] || "#ffffff"};
                                    font-size: 2.2vh;
                                    font-weight: bold;
                                ">
                                ${cell}
                            </th>
                        `;
                    }
                }


                /*
                 * DRUGI WIERSZ
                 *
                 * Ponieważ logo nie ma już rowspan="2",
                 * musimy zachować dwie komórki pod logo:
                 * Dzień oraz Data.
                 */
                else if (i === 1) {

                    if (j === 0 || j === 1) {

                        html += `
                            <th
                                style="
                                    background: #1e293b;
                                ">
                            </th>
                        `;
                    }

                    else if (j > 1) {

                        html += `
                            <th
                                style="
                                    color: #64748b;
                                    font-size: 1.4vh;
                                    font-weight: normal;
                                ">
                                ${cell}
                            </th>
                        `;
                    }
                }


                /*
                 * WIERSZE Z DANYMI
                 */
                else {

                    let className =
                        (j === 0) ? "day" :
                        (j === 1) ? "date" :
                        "tech-data";


                    let content =
                        (j === 0) ? shortenDay(cell) :
                        (j === 1) ? shortenDate(cell) :
                        cell;


                    let inlineStyle = "";
                    let specialClass = "";


                    const cellText =
                        String(cell).toLowerCase();


                    /*
                     * Sprawdzamy miesiąc na podstawie daty.
                     */
                    const rowDatePart =
                        row[1]
                            ? row[1].split("-")
                            : null;


                    const rowMonth =
                        rowDatePart
                            ? rowDatePart[1]
                            : null;


                    const isCellInSelectedMonth =
                        (rowMonth === currentViewMonth);


                    if (j > 1) {

                        /*
                         * Dane z innych miesięcy są wygaszone.
                         */
                        if (!isCellInSelectedMonth) {

                            inlineStyle =
                                "color: #64748b;";
                        }

                        else {

                            /*
                             * Alarm 8-16 po 15:30
                             * tylko dla dzisiejszego dnia.
                             */
                            if (
                                cellText.includes("8-16") &&
                                isToday &&
                                isAlarmTime
                            ) {

                                specialClass =
                                    " alarm-pulse";
                            }


                            /*
                             * Kolorowanie 8-16.
                             */
                            if (cellText.includes("8-16")) {

                                content =
                                    content.replace(
                                        /8-16/gi,
                                        '<span class="neon-blue-text">8-16</span>'
                                    );
                            }


                            /*
                             * Parking / 8:00 na szaro.
                             */
                            else if (
                                cellText.includes("parking") ||
                                cellText.includes("8:00")
                            ) {

                                inlineStyle =
                                    "color: #64748b;";
                            }
                        }
                    }


                    else {

                        /*
                         * Dzień i data dla innych miesięcy
                         * są wygaszone.
                         */
                        if (!isCellInSelectedMonth) {

                            inlineStyle =
                                "color: #475569;";
                        }
                    }


                    html += `
                        <td class="${className}${specialClass}">
                            <div class="marquee-box">
                                <span style="${inlineStyle}">
                                    ${content}
                                </span>
                            </div>
                        </td>
                    `;
                }

            });


            html += "</tr>";

        });


        html += "</table>";


        document.getElementById("table-container").innerHTML =
            html;


        /*
         * Wstawienie logo.
         */
        const logoCont =
            document.getElementById("main-logo-container");


        if (logoCont) {

            logoCont.innerHTML = `
                <img
                    src="${logoUrl}"
                    alt="Logo"
                    class="table-logo">
            `;
        }


        /*
         * Czas ostatniej aktualizacji.
         */
        document.getElementById("update-time").innerText =
            new Date().toLocaleTimeString();


        hideWeekends();


        /*
         * Uruchomienie przewijania długich tekstów.
         */
        setTimeout(initSmartMarquee, 200);

    }


    catch (err) {

        console.error(
            "Błąd Google Sheets:",
            err
        );


        /*
         * Ponowna próba po 10 sekundach.
         */
        setTimeout(loadData, 10000);
    }
}


/*
 * Automatyczne przewijanie długich wpisów.
 */
function initSmartMarquee() {

    const spans =
        document.querySelectorAll('.tech-data span');


    spans.forEach(span => {

        const box =
            span.parentElement;


        span.classList.remove(
            'animate-scroll'
        );


        if (span.offsetWidth > box.offsetWidth) {

            box.style.justifyContent =
                "flex-start";


            const distance =
                span.offsetWidth -
                box.offsetWidth +
                25;


            span.style.setProperty(
                '--scroll-dist',
                `-${distance}px`
            );


            span.classList.add(
                'animate-scroll'
            );
        }

        else {

            box.style.justifyContent =
                "center";
        }
    });
}


/*
 * Skracanie nazw dni.
 */
function shortenDay(day) {

    const days = {

        "poniedziałek": "Pon",
        "wtorek": "Wt",
        "środa": "Śr",
        "czwartek": "Czw",
        "piątek": "Pt",
        "sobota": "Sob",
        "niedziela": "Nd"

    };


    return days[String(day).toLowerCase()] || day;
}


/*
 * Skracanie daty.
 *
 * 2026-01-05 -> 05.01
 */
function shortenDate(dateStr) {

    const parts =
        String(dateStr).split("-");


    return parts.length === 3
        ? `${parts[2]}.${parts[1]}`
        : dateStr;
}


/*
 * Ukrywanie sobót i niedziel.
 */
function hideWeekends() {

    const rows =
        document.querySelectorAll("table tr");


    rows.forEach((row) => {

        const dayCell =
            row.querySelector(".day");


        if (
            dayCell &&
            (
                dayCell.innerText === "Sob" ||
                dayCell.innerText === "Nd"
            )
        ) {

            row.style.display =
                "none";
        }
    });
}


/*
 * Przyciski miesięcy.
 */
function renderNav() {

    let navHtml = "";


    for (let i = 1; i <= 12; i++) {

        const m =
            String(i).padStart(2, '0');


        navHtml += `
            <button
                class="nav-btn ${m === currentViewMonth ? 'active' : ''}"
                onclick="changeMonth('${m}')">
                ${monthNames[i - 1]}
            </button>
        `;
    }


    document.getElementById("month-nav").innerHTML =
        navHtml;
}


/*
 * Zmiana miesiąca.
 */
function changeMonth(m) {

    currentViewMonth =
        m;


    renderNav();


    loadData();
}


/*
 * Zegar + nagłówek miesiąca.
 */
function updateClock() {

    const clock =
        document.getElementById("clock");


    const now =
        new Date();


    if (clock) {

        clock.innerText =
            now.toLocaleTimeString("pl-PL");
    }


    const monthHeader =
        document.getElementById(
            "current-month-name"
        );


    if (monthHeader) {

        monthHeader.innerText =
            `${monthNames[
                parseInt(currentViewMonth) - 1
            ].toUpperCase()} 2026`;
    }
}


/*
 * Start.
 */
renderNav();

loadData();

setInterval(
    updateClock,
    1000
);

updateClock();


/*
 * Automatyczne odświeżanie co 3 minuty.
 */
setInterval(
    loadData,
    180000
);
```
