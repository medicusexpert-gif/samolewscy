```javascript
const spreadsheetId = "1E4yKKlvwMpPxiM_hL8ZyV-csz_poxcNPkYSLL8fRJXM";

const sheetNames = {
    "01": "Styczeń",
    "02": "Luty",
    "03": "Marzec",
    "04": "Kwiecień",
    "05": "Maj",
    "06": "Czerwiec",
    "07": "Lipiec",
    "08": "Sierpień",
    "09": "Wrzesień",
    "10": "Październik",
    "11": "Listopad",
    "12": "Grudzień"
};

const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

const logoUrl = "logo.png";
let currentViewMonth = String(new Date().getMonth() + 1).padStart(2, '0');

function parseCSVLine(line) {
    const result = [];
    let cur = "";
    let inQuote = false;
    const sep = line.includes(';') ? ';' : ',';

    for (let i = 0; i < line.length; i++) {
        let char = line[i];

        if (char === '"') {
            inQuote = !inQuote;
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

    return result.map(cell => cell.replace(/^"(.*)"$/, '$1'));
}

async function loadData() {

    const sheetName = sheetNames[currentViewMonth];

    const url =
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    try {

        const res = await fetch(url);

        const rawData = await res.text();

        const rows = rawData
            .split(/\r?\n/)
            .filter(line => line.trim() !== "")
            .map(parseCSVLine);

        const now = new Date();

        const isAlarmTime =
            (now.getHours() > 15) ||
            (now.getHours() === 15 && now.getMinutes() >= 30);

        const todayCSV =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const realMonth =
            String(now.getMonth() + 1).padStart(2, '0');

        const isCurrentMonthViewed =
            (currentViewMonth === realMonth);

        let html = "<table>";

        html += `<colgroup>
            <col style="width: 100px;">
            <col style="width: 130px;">
            <col style="width: auto;">
            <col style="width: auto;">
            <col style="width: auto;">
            <col style="width: auto;">
        </colgroup>`;

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

                if (i === 0) {

                    if (j === 0) {

                        html += `<th class="logo-space" rowspan="2" colspan="2" id="main-logo-container"></th>`;

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

                        html += `<th style="color: ${nameColors[j]}; font-size: 2.2vh; font-weight: bold;">${cell}</th>`;
                    }

                } 
                else if (i === 1) {

                    if (j > 1) {
                        html += `<th style="color: #64748b; font-size: 1.4vh; font-weight: normal;">${cell}</th>`;
                    }

                } 
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
                        cell.toLowerCase();

                    const rowDatePart =
                        row[1] ? row[1].split("-") : null;

                    const rowMonth =
                        rowDatePart ? rowDatePart[1] : null;

                    const isCellInSelectedMonth =
                        (rowMonth === currentViewMonth);

                    if (j > 1) {

                        if (!isCellInSelectedMonth) {

                            inlineStyle = "color: #64748b;";

                        } 
                        else {

                            if (
                                cellText.includes("8-16") &&
                                isToday &&
                                isAlarmTime
                            ) {
                                specialClass = " alarm-pulse";
                            }

                            if (cellText.includes("8-16")) {

                                content =
                                    content.replace(
                                        /8-16/i,
                                        '<span class="neon-blue-text">8-16</span>'
                                    );

                            } 
                            else if (
                                cellText.includes("parking") ||
                                cellText.includes("8:00")
                            ) {

                                inlineStyle = "color: #64748b;";
                            }
                        }

                    } 
                    else {

                        if (!isCellInSelectedMonth) {
                            inlineStyle = "color: #475569;";
                        }
                    }

                    html += `
                        <td class="${className}${specialClass}">
                            <div class="marquee-box">
                                <span style="${inlineStyle}">${content}</span>
                            </div>
                        </td>
                    `;
                }
            });

            html += "</tr>";
        });

        html += "</table>";

        document.getElementById("table-container").innerHTML = html;

        const logoCont =
            document.getElementById("main-logo-container");

        if (logoCont) {
            logoCont.innerHTML =
                `<img src="${logoUrl}" alt="Logo" class="table-logo">`;
        }

        document.getElementById("update-time").innerText =
            new Date().toLocaleTimeString();

        hideWeekends();

        setTimeout(initSmartMarquee, 200);

    } catch (err) {

        console.error("Błąd CSV:", err);

        setTimeout(loadData, 10000);
    }
}

function initSmartMarquee() {

    const spans =
        document.querySelectorAll('.tech-data span');

    spans.forEach(span => {

        const box = span.parentElement;

        span.classList.remove('animate-scroll');

        if (span.offsetWidth > box.offsetWidth) {

            box.style.justifyContent = "flex-start";

            const distance =
                span.offsetWidth -
                box.offsetWidth +
                25;

            span.style.setProperty(
                '--scroll-dist',
                `-${distance}px`
            );

            span.classList.add('animate-scroll');

        } 
        else {

            box.style.justifyContent = "center";
        }
    });
}

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

    return days[day.toLowerCase()] || day;
}

function shortenDate(dateStr) {

    const parts = dateStr.split("-");

    return parts.length === 3
        ? `${parts[2]}.${parts[1]}`
        : dateStr;
}

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
            row.style.display = "none";
        }
    });
}

function renderNav() {

    let navHtml = "";

    for (let i = 1; i <= 12; i++) {

        const m =
            String(i).padStart(2, '0');

        navHtml += `
            <button
                class="nav-btn ${m === currentViewMonth ? 'active' : ''}"
                onclick="changeMonth('${m}')"
            >
                ${monthNames[i - 1]}
            </button>
        `;
    }

    document.getElementById("month-nav").innerHTML =
        navHtml;
}

function changeMonth(m) {

    currentViewMonth = m;

    renderNav();

    loadData();
}

function updateClock() {

    const clock =
        document.getElementById("clock");

    const now = new Date();

    if (clock) {
        clock.innerText =
            now.toLocaleTimeString("pl-PL");
    }

    const monthHeader =
        document.getElementById("current-month-name");

    if (monthHeader) {

        monthHeader.innerText =
            `${monthNames[parseInt(currentViewMonth) - 1].toUpperCase()} 2026`;
    }
}

renderNav();

loadData();

setInterval(updateClock, 1000);

updateClock();

setInterval(loadData, 180000);
```
