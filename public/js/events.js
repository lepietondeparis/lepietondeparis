document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-events-calendar]").forEach(initCalendar);
});

function initCalendar(root) {
  const dataElement = root.querySelector("[data-events]");
  const grid = root.querySelector("[data-grid]");
  const monthLabel = root.querySelector("[data-month]");
  const eventsList = root.querySelector("[data-events-list]");
  const eventsTitle = root.querySelector("[data-events-title]");
  const countLabel = root.querySelector("[data-count]");

  if (!dataElement || !grid || !monthLabel || !eventsList) return;

  let events;

  try {
    events = JSON.parse(dataElement.textContent);
  } catch (error) {
    console.error("Impossible de lire les événements Hugo.", error);
    return;
  }

  const parseDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");

    if (!match) return null;

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12
    );

    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) {
      return null;
    }

    return date;
  };

  const formatDate = (date) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);

  const formatMonth = (date) =>
    new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric"
    }).format(date);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const startOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1, 12);

  const validEvents = events
    .filter((event) => parseDate(event.date_debut))
    .map((event) => {
      const start = parseDate(event.date_debut);
      const endCandidate = parseDate(event.date_fin);
      const end =
        endCandidate && endCandidate >= start ? endCandidate : start;

      return { ...event, start, end };
    })
    .sort((a, b) => a.start - b.start);

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let displayedMonth = startOfMonth(today);
  let selectedDate = null;

  function eventsOnDate(date) {
    return validEvents.filter(
      (event) => date >= event.start && date <= event.end
    );
  }

  function eventsInMonth(date) {
    const first = startOfMonth(date);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);

    return validEvents.filter(
      (event) => event.start <= last && event.end >= first
    );
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function renderCalendar() {
    grid.replaceChildren();

    monthLabel.textContent = formatMonth(displayedMonth);

    const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    weekdays.forEach((day) => {
      const cell = createElement("div", "calendar-weekday", day);
      cell.setAttribute("role", "columnheader");
      grid.appendChild(cell);
    });

    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();

    const firstDay = new Date(year, month, 1, 12);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const empty = createElement("div", "calendar-day calendar-day--empty");
      empty.setAttribute("aria-hidden", "true");
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day, 12);
      const dayEvents = eventsOnDate(date);

      const isToday = sameDay(date, today);
      const isSelected = selectedDate && sameDay(date, selectedDate);

      const classes = ["calendar-day"];

      if (dayEvents.length) classes.push("calendar-day--event");
      if (isToday) classes.push("calendar-day--today");
      if (isSelected) classes.push("calendar-day--selected");

      const cell = createElement(
        dayEvents.length ? "button" : "div",
        classes.join(" ")
      );

      if (dayEvents.length) {
        cell.type = "button";
        cell.setAttribute(
          "aria-label",
          `${formatDate(date)} : ${dayEvents.map((event) => event.titre).join(", ")}`
        );

        cell.addEventListener("click", () => {
          selectedDate = date;
          renderCalendar();
          renderEvents(date);
        });
      }

      const number = createElement("span", "calendar-day__number", String(day));

      if (isToday) {
        number.setAttribute("aria-label", "Aujourd'hui");
      }

      cell.appendChild(number);

      if (dayEvents.length) {
        cell.appendChild(
          createElement("span", "calendar-day__indicator")
        );

        cell.appendChild(
          createElement(
            "span",
            "calendar-day__label",
            dayEvents[0].titre
          )
        );
      }

      grid.appendChild(cell);
    }
  }

  function renderEvents(date = null) {
    eventsList.replaceChildren();

    const list = date ? eventsOnDate(date) : eventsInMonth(displayedMonth);

    eventsTitle.textContent = date
      ? `Événements du ${formatDate(date)}`
      : `Les événements de ${formatMonth(displayedMonth)}`;

    countLabel.textContent =
      `${list.length} événement${list.length > 1 ? "s" : ""}`;

    if (!list.length) {
      const message = date
        ? "Aucun événement à cette date."
        : "Aucun événement prévu pour ce mois.";

      eventsList.appendChild(
        createElement("p", "calendar-empty", message)
      );

      return;
    }

    list.forEach((event) => {
      const card = createElement("article", "calendar-event");

      if (event.image) {
        const image = createElement("img", "calendar-event__image");

        image.src = event.image;
        image.alt = "";
        image.loading = "lazy";

        card.appendChild(image);
      } else {
        card.appendChild(
          createElement("div", "calendar-event__image")
        );
      }

      const content = createElement("div", "calendar-event__content");

      const dateText =
        sameDay(event.start, event.end)
          ? formatDate(event.start)
          : `${formatDate(event.start)} – ${formatDate(event.end)}`;

      content.appendChild(
        createElement("div", "calendar-event__date", dateText)
      );

      content.appendChild(
        createElement("h4", "calendar-event__title", event.titre)
      );

      if (event.lieu) {
        content.appendChild(
          createElement("p", "calendar-event__place", `📍 ${event.lieu}`)
        );
      }

      if (event.description) {
        content.appendChild(
          createElement(
            "p",
            "calendar-event__description",
            event.description
          )
        );
      }

      if (event.url) {
        try {
          const url = new URL(event.url, window.location.href);

          if (["https:", "http:"].includes(url.protocol)) {
            const link = createElement(
              "a",
              "calendar-event__link",
              "En savoir plus ↗"
            );

            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            content.appendChild(link);
          }
        } catch {
          // Ignore les URL invalides.
        }
      }

      card.appendChild(content);
      eventsList.appendChild(card);
    });
  }

  root.querySelector("[data-prev]").addEventListener("click", () => {
    displayedMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() - 1,
      1,
      12
    );

    selectedDate = null;
    renderCalendar();
    renderEvents();
  });

  root.querySelector("[data-next]").addEventListener("click", () => {
    displayedMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() + 1,
      1,
      12
    );

    selectedDate = null;
    renderCalendar();
    renderEvents();
  });

  renderCalendar();
  renderEvents();
}