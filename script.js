const spreadsheetId = "1E4yKKlvwMpPxiM_hL8ZyV-csz_poxcNPkYSLL8fRJXM";

const monthNames = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień"
];

const technicianNames = [
    "Przemek",
    "Agata",
    "Zuzia",
    "Mikołaj"
];

const logoUrl = "logo.png";

let currentViewMonth = String(new Date().getMonth() + 1).padStart(2, '0');

const nameColors = {
    2: "#38bdf8",
    3: "#818cf8",
    4: "#fbbf24",
    5: "#f472b6"
};


// ============================================================
// POBIERANIE DANYCH
// ============================================================

async function getSheetData(sheetName) {

    const url =
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    const response = await fetch(url, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Błąd pobierania danych: ${response.status}`);
    }

    return await response.text();
}


// ============================================================
// PARSOWANIE CSV
// ============================================================

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if ((char === ";" || char === ",") && !insideQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}


// ============================================================
// ŁADOWANIE DANYCH
// ============================================================

async function loadData() {

    const sheetName =
        monthNames[parseInt(currentViewMonth, 10) - 1];

    try {

        const csvText = await getSheetData(sheetName);

        const lines = csvText
            .replace(/\r/g, "")
            .split("\n")
            .filter(line => line.trim() !== "");

        const rows = lines.map(parseCSVLine);

        let html = `
            <table>
                <tbody>
        `;

        // NAGŁÓWKI
        for (let i = 0; i < 2 && i < rows.length; i++) {

            html += "<tr>";

            const row = rows[i];

            for (let j = 0; j < 6; j++) {

                const value =
                    row[j] !== undefined
                        ? row[j].trim()
                        : "";

                if (i === 0) {

                    if (j === 0) {

                        html += `
                            <th class="logo-space"
                                rowspan="2"
                                colspan="2"
                                id="main-logo-container">
                            </th>
                        `;

                    } else if (j > 1) {

                        html += `
                            <th style="
                                color: ${nameColors[j]};
                                font-size: 2.2vh;
                                font-weight: bold;">
                                ${technicianNames[j - 2]}
                            </th>
                        `;
                    }

                } else {

                    if (j > 1) {

                        html += `<th>${value}</th>`;

                    }
                }
            }

            html += "</tr>";
        }


        // DANE
        let weekNumber = 0;
        let lastDate = null;

        for (let i = 2; i < rows.length; i++) {

            const row = rows[i];

            if (!row || row.length === 0) {
                continue;
            }

            const day =
                row[0] !== undefined
                    ? row[0].trim()
                    : "";

            const date =
                row[1] !== undefined
                    ? row[1].trim()
                    : "";

            if (!day && !date) {
                continue;
            }

            if (date && date !== lastDate) {
                weekNumber++;
                lastDate = date;
            }

            const weekClass =
                weekNumber % 2 === 0
                    ? "week-even"
                    : "week-odd";

            let isToday = false;

            if (date) {

                let dateObj = null;

                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {

                    const parts = date.split("-");

                    dateObj = new Date(
                        parseInt(parts[0]),
                        parseInt(parts[1]) - 1,
                        parseInt(parts[2])
                    );

                } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {

                    const parts = date.split(".");

                    dateObj = new Date(
                        parseInt(parts[2]),
                        parseInt(parts[1]) - 1,
                        parseInt(parts[0])
                    );
                }

                if (dateObj) {

                    const today = new Date();

                    isToday =
                        dateObj.getFullYear() === today.getFullYear() &&
                        dateObj.getMonth() === today.getMonth() &&
                        dateObj.getDate() === today.getDate();
                }
            }

            html += `
                <tr class="${weekClass}${isToday ? " today-row" : ""}">
                    <td class="day">${shortenDay(day)}</td>
                    <td class="date">${shortenDate(date)}</td>
            `;

            for (let j = 2; j < 6; j++) {

                const cell =
                    row[j] !== undefined
                        ? row[j]
                        : "";

                html += `
                    <td class="tech-data">
                        <span>${escapeHtml(cell)}</span>
                    </td>
                `;
            }

            html += "</tr>";
        }

        html += `
                </tbody>
            </table>
        `;

        document.getElementById("table-container").innerHTML = html;


        // LOGO — BEZ ZMIAN
        const logoContainer =
            document.getElementById("main-logo-container");

        if (logoContainer) {

            logoContainer.innerHTML = `
                <img src="${logoUrl}"
                     class="table-logo"
                     alt="Medicus Expert">
            `;
        }

        hideWeekends();
        applyAlarm();
        applyMarquee();

        document.getElementById("update-time").textContent =
            new Date().toLocaleTimeString("pl-PL");

    } catch (error) {

        console.error("Błąd pobierania danych:", error);

        document.getElementById("table-container").innerHTML = `
            <div style="
                width:100%;
                height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
                color:#f87171;
                font-size:2.5vh;">
                Nie udało się pobrać danych.
            </div>
        `;
    }
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// SKRÓCENIE DNIA
// ============================================================

function shortenDay(day) {

    const days = {
        "poniedziałek": "Pon",
        "pon": "Pon",
        "wtorek": "Wt",
        "wt": "Wt",
        "środa": "Śr",
        "sroda": "Śr",
        "śr": "Śr",
        "czwartek": "Czw",
        "czw": "Czw",
        "piątek": "Pt",
        "piatek": "Pt",
        "pt": "Pt",
        "sobota": "Sob",
        "sob": "Sob",
        "niedziela": "Nd",
        "nd": "Nd"
    };

    const value =
        String(day).trim().toLowerCase();

    return days[value] || day;
}


// ============================================================
// SKRÓCENIE DATY
// ============================================================

function shortenDate(date) {

    if (!date) {
        return "";
    }

    const value = String(date).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {

        const parts = value.split("-");

        return `${parts[2]}.${parts[1]}`;
    }

    if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {

        return value.substring(0, 5);
    }

    return value;
}


// ============================================================
// UKRYWANIE WEEKENDÓW
// ============================================================

function hideWeekends() {

    const rows =
        document.querySelectorAll("#table-container tr");

    rows.forEach(row => {

        const day =
            row.querySelector(".day");

        if (!day) {
            return;
        }

        const value =
            day.textContent.trim();

        if (value === "Sob" || value === "Nd") {
            row.style.display = "none";
        }
    });
}


// ============================================================
// ALARM
// ============================================================

function applyAlarm() {

    const cells =
        document.querySelectorAll(".tech-data");

    const now = new Date();

    const currentTime =
        now.getHours() * 60 + now.getMinutes();

    const alarmStart = 15 * 60 + 30;
    const alarmEnd = 16 * 60;

    cells.forEach(cell => {

        const text =
            cell.textContent.trim();

        if (text === "8-16") {

            if (
                currentTime >= alarmStart &&
                currentTime < alarmEnd
            ) {
                cell.classList.add("alarm-pulse");
            } else {
                cell.classList.remove("alarm-pulse");
            }
        }
    });
}


// ============================================================
// MARQUEE
// ============================================================

function applyMarquee() {

    const cells =
        document.querySelectorAll(".tech-data");

    cells.forEach(cell => {

        const text =
            cell.textContent.trim();

        if (!text) {
            return;
        }

        if (cell.scrollWidth > cell.clientWidth) {

            if (!cell.querySelector(".marquee-box")) {

                const original =
                    cell.innerHTML;

                cell.innerHTML = `
                    <div class="marquee-box">
                        <span>${original}</span>
                    </div>
                `;

                const box =
                    cell.querySelector(".marquee-box");

                const span =
                    box.querySelector("span");

                const distance =
                    span.scrollWidth - box.clientWidth;

                if (distance > 0) {

                    span.style.setProperty(
                        "--scroll-dist",
                        `-${distance}px`
                    );

                    span.classList.add(
                        "animate-scroll"
                    );
                }
            }
        }
    });
}


// ============================================================
// NAWIGACJA
// ============================================================

function renderNav() {

    const nav =
        document.getElementById("month-nav");

    if (!nav) {
        return;
    }

    nav.innerHTML = "";

    monthNames.forEach((name, index) => {

        const month =
            String(index + 1).padStart(2, "0");

        const button =
            document.createElement("button");

        button.className =
            "nav-btn" +
            (month === currentViewMonth
                ? " active"
                : "");

        button.textContent =
            name.substring(0, 3);

        button.onclick = () =>
            changeMonth(month);

        nav.appendChild(button);
    });
}


// ============================================================
// ZMIANA MIESIĄCA
// ============================================================

function changeMonth(month) {

    currentViewMonth =
        String(month).padStart(2, "0");

    renderNav();
    loadData();
}


// ============================================================
// ZEGAR
// ============================================================

function updateClock() {

    const now = new Date();

    const clock =
        document.getElementById("clock");

    if (clock) {

        clock.textContent =
            now.toLocaleTimeString(
                "pl-PL",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }

    const title =
        document.getElementById(
            "current-month-name"
        );

    if (title) {

        title.textContent =
            `${monthNames[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
    }
}


// ============================================================
// START
// ============================================================

renderNav();

updateClock();

loadData();

setInterval(updateClock, 1000);

setInterval(loadData, 180000);
