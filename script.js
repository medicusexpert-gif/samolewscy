const SPREADSHEET_ID = "1E4yKKlvwMpPxiM_hL8ZyV-csz_poxcNPkYSLL8fRJXM";

/*
 * Każdy miesiąc jest osobną zakładką Google Sheets.
 */
const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

const logoUrl = "logo.png";

/*
 * Imiona techników.
 */
const technicianNames = [
    "Przemek",
    "Agata",
    "Zuzia",
    "Mikołaj"
];

/*
 * Rok jest pobierany automatycznie z dat
 * znajdujących się w kolumnie B arkusza.
 */
let sourceYear = new Date().getFullYear();

let currentViewMonth =
    String(new Date().getMonth() + 1).padStart(2, '0');


/* ============================================================
   GOOGLE SHEETS
   ============================================================ */

function getSheetUrl(monthNumber) {

    const sheetName =
        monthNames[parseInt(monthNumber, 10) - 1];

    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}


/* ============================================================
   CSV
   ============================================================ */

function parseCSVLine(line) {

    const result = [];
    let cur = "";
    let inQuote = false;

    const sep =
        line.includes(';') ? ';' : ',';

    for (let i = 0; i < line.length; i++) {

        const char = line[i];

        if (char === '"') {

            if (
                inQuote &&
                line[i + 1] === '"'
            ) {
                cur += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }

        } else if (
            char === sep &&
            !inQuote
        ) {

            result.push(cur.trim());
            cur = "";

        } else {

            cur += char;
        }
    }

    result.push(cur.trim());

    return result.map(cell =>
        cell.replace(/^"(.*)"$/, '$1')
    );
}


/* ============================================================
   PARSOWANIE DAT
   ============================================================

   Google Sheets może zwrócić datę w różnych formatach.

   Obsługujemy m.in.:

   2026-01-05
   05.01.2026
   5.1.2026
   01/05/2026
   1/5/2026
   Date(2026,0,5)

   Funkcja zwraca:

   {
       year: 2026,
       month: 1,
       day: 5
   }

   albo null, jeżeli nie uda się rozpoznać daty.
*/

function parseSourceDate(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    let str =
        String(value).trim();

    if (!str) {
        return null;
    }


    /* --------------------------------------------------------
       Google Visualization format:

       Date(2026,0,5)
       -------------------------------------------------------- */

    let match =
        str.match(
            /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)$/
        );

    if (match) {

        return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10) + 1,
            day: parseInt(match[3], 10)
        };
    }


    /* --------------------------------------------------------
       Format:

       2026-01-05
       -------------------------------------------------------- */

    match =
        str.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})/
        );

    if (match) {

        return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10),
            day: parseInt(match[3], 10)
        };
    }


    /* --------------------------------------------------------
       Format:

       05.01.2026
       5.1.2026
       -------------------------------------------------------- */

    match =
        str.match(
            /^(\d{1,2})\.(\d{1,2})\.(\d{4})/
        );

    if (match) {

        return {
            year: parseInt(match[3], 10),
            month: parseInt(match[2], 10),
            day: parseInt(match[1], 10)
        };
    }


    /* --------------------------------------------------------
       Format:

       05/01/2026
       5/1/2026

       W Google Sheets przy polskim arkuszu
       może również pojawić się taki zapis.
       Zakładamy tutaj DD/MM/YYYY.
       -------------------------------------------------------- */

    match =
        str.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
        );

    if (match) {

        return {
            year: parseInt(match[3], 10),
            month: parseInt(match[2], 10),
            day: parseInt(match[1], 10)
        };
    }


    /* --------------------------------------------------------
       Ostatnia próba przez Date()
       -------------------------------------------------------- */

    const parsed =
        new Date(str);

    if (!isNaN(parsed.getTime())) {

        return {
            year: parsed.getFullYear(),
            month: parsed.getMonth() + 1,
            day: parsed.getDate()
        };
    }

    return null;
}


/* ============================================================
   DATA -> YYYY-MM-DD
   ============================================================ */

function dateToISO(dateObj) {

    if (!dateObj) {
        return null;
    }

    return (
        `${dateObj.year}-` +
        `${String(dateObj.month).padStart(2, '0')}-` +
        `${String(dateObj.day).padStart(2, '0')}`
    );
}


/* ============================================================
   DATA -> DD.MM
   ============================================================ */

function shortenDate(dateStr) {

    const dateObj =
        parseSourceDate(dateStr);

    if (!dateObj) {
        return dateStr;
    }

    return (
        `${String(dateObj.day).padStart(2, '0')}.` +
        `${String(dateObj.month).padStart(2, '0')}`
    );
}


/* ============================================================
   GŁÓWNE ŁADOWANIE DANYCH
   ============================================================ */

async function loadData() {

    /*
     * Dodajemy znacznik czasu,
     * żeby przeglądarka nie korzystała ze starej wersji CSV.
     */
    const baseUrl =
        getSheetUrl(currentViewMonth);

    const url =
        `${baseUrl}&cacheBust=${Date.now()}`;


    try {

        const res =
            await fetch(url, {
                cache: "no-store"
            });


        if (!res.ok) {

            throw new Error(
                `HTTP ${res.status}`
            );
        }


        const rawData =
            await res.text();


        const rows =
            rawData
                .split(/\r?\n/)
                .filter(line =>
                    line.trim() !== ""
                )
                .map(parseCSVLine);


        if (!rows.length) {

            throw new Error(
                "Arkusz nie zawiera danych."
            );
        }


        /* ====================================================
           POBIERANIE ROKU Z B3:B35
           ====================================================

           Wiersz 1 CSV = indeks 0
           Wiersz 2 CSV = indeks 1
           Wiersz 3 CSV = indeks 2

           Dlatego sprawdzamy:

           rows[2] ... rows[34]

           czyli dokładnie B3:B35.
        */

        let detectedYear = null;

        for (
            let rowIndex = 2;
            rowIndex <= 34 && rowIndex < rows.length;
            rowIndex++
        ) {

            const row =
                rows[rowIndex];

            if (!row || !row[1]) {
                continue;
            }

            const dateObj =
                parseSourceDate(row[1]);

            if (
                dateObj &&
                dateObj.year
            ) {

                detectedYear =
                    dateObj.year;

                break;
            }
        }


        /*
         * Jeżeli znaleźliśmy rok w B3:B35,
         * zapisujemy go jako rok źródłowy.
         */
        if (detectedYear) {

            sourceYear =
                detectedYear;
        }


        /* ====================================================
           AKTUALNY CZAS
           ==================================================== */

        const now =
            new Date();


        const isAlarmTime =
            (
                now.getHours() > 15
            ) ||
            (
                now.getHours() === 15 &&
                now.getMinutes() >= 30
            );


        /*
         * Dzisiejsza data jako obiekt.
         */
        const todayYear =
            now.getFullYear();

        const todayMonth =
            now.getMonth() + 1;

        const todayDay =
            now.getDate();


        /*
         * Aktualny miesiąc.
         */
        const realMonth =
            String(
                todayMonth
            ).padStart(2, '0');


        const isCurrentMonthViewed =
            currentViewMonth === realMonth;


        /* ====================================================
           BUDOWANIE TABELI
           ==================================================== */

        let html =
            "<table>";


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


            /* ------------------------------------------------
               LICZENIE TYGODNI
               ------------------------------------------------ */

            if (
                i > 1 &&
                row[0] &&
                String(row[0])
                    .toLowerCase()
                    .includes("poniedziałek")
            ) {

                weekCounter++;
            }


            const weekClass =
                weekCounter % 2 === 0
                    ? "week-even"
                    : "week-odd";


            /* ------------------------------------------------
               DATA WIERSZA
               ------------------------------------------------ */

            const rowDate =
                row[1]
                    ? parseSourceDate(row[1])
                    : null;


            /*
             * Czy jest to dzisiejszy dzień?
             */
            const isToday =
                rowDate &&
                rowDate.year === todayYear &&
                rowDate.month === todayMonth &&
                rowDate.day === todayDay;


            const todayRowClass =
                isToday
                    ? " today-row"
                    : "";


            html += `
                <tr class="${weekClass}${todayRowClass}">
            `;


            /* =================================================
               KOLUMNY
               ================================================= */

            row.forEach((cell, j) => {


                /*
                 * Harmonogram ma 6 kolumn:
                 *
                 * 0 = dzień
                 * 1 = data
                 * 2 = technik 1
                 * 3 = technik 2
                 * 4 = technik 3
                 * 5 = technik 4
                 */
                if (j > 5) {
                    return;
                }


                /* =================================================
                   PIERWSZY WIERSZ
                   ================================================= */

                if (i === 0) {


                    if (j === 0) {

                        html += `
                            <th
                                class="logo-space"
                                rowspan="2"
                                colspan="2"
                                id="main-logo-container">
                            </th>
                        `;


                    } else if (j > 1) {


                        const nameColors = [
                            "#38bdf8",
                            "#818cf8",
                            "#fbbf24",
                            "#f472b6"
                        ];


                        const technicianIndex =
                            j - 2;


                        const technicianName =
                            technicianNames[
                                technicianIndex
                            ] || "";


                        html += `
                            <th
                                style="
                                    color: ${
                                        nameColors[
                                            technicianIndex
                                        ] || "#ffffff"
                                    };
                                    font-size: 2.2vh;
                                    font-weight: bold;
                                ">
                                ${technicianName}
                            </th>
                        `;
                    }


                /* =================================================
                   DRUGI WIERSZ
                   ================================================= */

                } else if (i === 1) {


                    if (j > 1) {

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


                /* =================================================
                   WIERSZE Z DANYMI
                   ================================================= */

                } else {


                    let className =
                        j === 0
                            ? "day"
                            : j === 1
                                ? "date"
                                : "tech-data";


                    let content =
                        j === 0
                            ? shortenDay(cell)
                            : j === 1
                                ? shortenDate(cell)
                                : cell;


                    let inlineStyle = "";
                    let specialClass = "";


                    const cellText =
                        String(cell)
                            .toLowerCase();


                    /*
                     * Miesiąc daty źródłowej.
                     */
                    const rowMonth =
                        rowDate
                            ? String(rowDate.month)
                                .padStart(2, '0')
                            : null;


                    const isCellInSelectedMonth =
                        rowMonth === currentViewMonth;


                    /* =================================================
                       KOMÓRKI TECHNIKÓW
                       ================================================= */

                    if (j > 1) {


                        if (!isCellInSelectedMonth) {

                            inlineStyle =
                                "color: #64748b;";


                        } else {


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
                             * Niebieskie 8-16.
                             */
                            if (
                                cellText.includes("8-16")
                            ) {

                                content =
                                    String(content).replace(
                                        /8-16/gi,
                                        '<span class="neon-blue-text">8-16</span>'
                                    );


                            } else if (
                                cellText.includes("parking") ||
                                cellText.includes("8:00")
                            ) {

                                inlineStyle =
                                    "color: #64748b;";
                            }
                        }


                    } else {


                        /*
                         * Dzień i data spoza wybranego miesiąca
                         * są przygaszone.
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


        /* ====================================================
           WSTAWIENIE TABELI
           ==================================================== */

        const tableContainer =
            document.getElementById(
                "table-container"
            );


        if (tableContainer) {

            tableContainer.innerHTML =
                html;
        }


        /* ====================================================
           LOGO
           ==================================================== */

        const logoCont =
            document.getElementById(
                "main-logo-container"
            );


        if (logoCont) {

            logoCont.innerHTML = `
                <img
                    src="${logoUrl}"
                    alt="Logo"
                    class="table-logo">
            `;
        }


        /* ====================================================
           CZAS AKTUALIZACJI
           ==================================================== */

        const updateTime =
            document.getElementById(
                "update-time"
            );


        if (updateTime) {

            updateTime.innerText =
                new Date()
                    .toLocaleTimeString("pl-PL");
        }


        /* ====================================================
           UKRYWANIE WEEKENDÓW
           ==================================================== */

        hideWeekends();


        /* ====================================================
           MARQUEE
           ==================================================== */

        setTimeout(
            initSmartMarquee,
            200
        );


        /*
         * Po załadowaniu danych od razu
         * aktualizujemy nagłówek miesiąca i roku.
         */
        updateClock();


    } catch (err) {


        console.error(
            "Błąd Google Sheets:",
            err
        );


        /*
         * Ponowna próba po 10 sekundach.
         */
        setTimeout(
            loadData,
            10000
        );
    }
}


/* ============================================================
   MARQUEE
   ============================================================ */

function initSmartMarquee() {

    const spans =
        document.querySelectorAll(
            '.tech-data span'
        );


    spans.forEach(span => {

        const box =
            span.parentElement;


        span.classList.remove(
            'animate-scroll'
        );


        if (
            span.offsetWidth >
            box.offsetWidth
        ) {

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


        } else {

            box.style.justifyContent =
                "center";
        }
    });
}


/* ============================================================
   SKRÓCONY DZIEŃ TYGODNIA
   ============================================================ */

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


    return days[
        String(day)
            .toLowerCase()
    ] || day;
}


/* ============================================================
   UKRYWANIE WEEKENDÓW
   ============================================================ */

function hideWeekends() {

    const rows =
        document.querySelectorAll(
            "table tr"
        );


    rows.forEach(row => {

        const dayCell =
            row.querySelector(
                ".day"
            );


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


/* ============================================================
   NAWIGACJA MIESIĘCY
   ============================================================ */

function renderNav() {

    let navHtml = "";


    for (let i = 1; i <= 12; i++) {

        const m =
            String(i)
                .padStart(2, '0');


        navHtml += `
            <button
                class="nav-btn ${
                    m === currentViewMonth
                        ? 'active'
                        : ''
                }"
                onclick="changeMonth('${m}')">
                ${monthNames[i - 1]}
            </button>
        `;
    }


    const monthNav =
        document.getElementById(
            "month-nav"
        );


    if (monthNav) {

        monthNav.innerHTML =
            navHtml;
    }
}


/* ============================================================
   ZMIANA MIESIĄCA
   ============================================================ */

function changeMonth(m) {

    currentViewMonth =
        m;


    renderNav();


    /*
     * Wyczyść starą tabelę przed
     * załadowaniem nowego miesiąca.
     */
    const tableContainer =
        document.getElementById(
            "table-container"
        );


    if (tableContainer) {

        tableContainer.innerHTML = "";
    }


    loadData();
}


/* ============================================================
   ZEGAR + NAGŁÓWEK
   ============================================================ */

function updateClock() {

    const clock =
        document.getElementById(
            "clock"
        );


    const now =
        new Date();


    if (clock) {

        clock.innerText =
            now.toLocaleTimeString(
                "pl-PL"
            );
    }


    /*
     * Nagłówek:
     *
     * STYCZEŃ 2026
     *
     * Rok pochodzi z B3:B35.
     */
    const monthHeader =
        document.getElementById(
            "current-month-name"
        );


    if (monthHeader) {

        const monthIndex =
            parseInt(
                currentViewMonth,
                10
            ) - 1;


        monthHeader.innerText =
            `${monthNames[monthIndex].toUpperCase()} ${sourceYear}`;
    }
}


/* ============================================================
   START
   ============================================================ */

renderNav();

loadData();


/*
 * Zegar co sekundę.
 */
setInterval(
    updateClock,
    1000
);


updateClock();


/*
 * Automatyczne odświeżanie danych
 * co 3 minuty.
 */
setInterval(
    loadData,
    180000
);
