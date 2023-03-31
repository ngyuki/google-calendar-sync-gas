type CalendarEvent = GoogleAppsScript.Calendar.CalendarEvent;
const TAGNAME = "calendar-sync-id";

function main() {
    const { calendarId, jsonUrl } = fetchScriptProperties();

    const { start, end, items } = mappingJsonByEventId(fetchJson(jsonUrl));
    console.log(`fetch ${Object.keys(items).length} json items`);

    const calendar = CalendarApp.getCalendarById(calendarId);

    const { events, dups } = mappingCalendarEventsByEventId(calendar.getEvents(start, nextDay(end)));
    console.log(`fetch ${Object.keys(events).length} calendar events`);

    const ids = Array.from(new Set([...Object.keys(items), ...Object.keys(events)]));
    for (const eid of ids) {
        const item = items[eid];
        const event = events[eid];
        if (!item && event) {
            console.log(`delete: ${formatEvent(event)}`);
            event.deleteEvent();
        } else if (item && !event) {
            console.log(`new: ${formatItem(item)}`);
            let newEvent: CalendarEvent;
            if (!item.noTime) {
                newEvent = calendar.createEvent(item.title, item.start, item.end);
            } else if (formatDate(item.start) === formatDate(item.end)) {
                newEvent = calendar.createAllDayEvent(item.title, item.start);
            } else {
                newEvent = calendar.createAllDayEvent(item.title, item.start, item.end);
            }
            newEvent.setTag(TAGNAME, item.id);
            if (item.description) {
                newEvent.setDescription(item.description);
            }
        } else if (item && event) {
            if (!compareItem(item, event)) {
                console.log(`update: ${formatItem(item)} -> ${formatEvent(event)}`);
                event.setTitle(item.title);
                event.setDescription(item.description);
                if (!item.noTime) {
                    event.setTime(item.start, item.end);
                } else if (formatDate(item.start) === formatDate(item.end)) {
                    event.setAllDayDate(item.start);
                } else {
                    event.setAllDayDates(item.start, item.end);
                }
            }
        }
    }
    for (const event of dups) {
        console.log(`delete: ${formatEvent(event)}`);
        event.deleteEvent();
    }
}

function nextDay(d: Date): Date {
    const ret = new Date(d.valueOf());
    ret.setDate(d.getDate() + 1);
    return ret;
}

function fetchScriptProperties() {
    const calendarId = PropertiesService.getScriptProperties().getProperty('calendar_id');
    const jsonUrl = PropertiesService.getScriptProperties().getProperty('json_url');
    if (!calendarId) {
        throw new Error(`must be set script property "calendar_id"`);
    }
    if (!jsonUrl) {
        throw new Error(`must be set script property "json_url"`);
    }
    return { calendarId, jsonUrl }
}

type JsonResponse = {
    start: Date,
    end: Date
    events: JsonItem[],
};

type JsonItem = {
    id: string,
    title: string,
    description: string,
    noTime: boolean,
    start: Date,
    end: Date
};

function fetchJson(url: string): JsonResponse {
    const res = UrlFetchApp.fetch(url);
    const text = res.getContentText();
    const data = JSON.parse(text);
    return {
        start: new Date(data.start),
        end: new Date(data.end),
        events: data.events.map((item: any) => ({
            ...item,
            start: new Date(item.start),
            end: new Date(item.end),
        }))
    };
}

function mappingJsonByEventId(res: JsonResponse) {
    const ret: { [K: string]: JsonItem } = {};
    for (const ev of res.events) {
        const gid = ev.id;
        if (!gid || ret[gid]) {
            continue;
        }
        ret[gid] = ev;
    }
    return {
        start: res.start,
        end: res.end,
        items: ret,
    }
}

function mappingCalendarEventsByEventId(events: CalendarEvent[]) {
    const ret: { [K: string]: CalendarEvent } = {};
    const dups: CalendarEvent[] = [];
    for (const ev of events) {
        const gid = ev.getTag(TAGNAME);
        if (!gid) {
            continue;
        }
        if (ret[gid]) {
            dups.push(ev);
            continue;
        }
        ret[gid] = ev;
    }
    return { events: ret, dups };
}

function compareItem(item: JsonItem, event: CalendarEvent){
    if (item.noTime !== event.isAllDayEvent()) {
        return false;
    }
    if (item.title !== event.getTitle()) {
        return false;
    }
    if (item.description !== event.getDescription()) {
        return false;
    }
    if (item.noTime) {
        if (formatDate(item.start) !== formatDate(event.getAllDayStartDate())) {
            return false;
        }
        const end = (new Date());
        end.setTime(event.getAllDayEndDate().getTime() - 1);
        if (formatDate(item.end) !== formatDate(end)) {
            return false;
        }
    } else {
        if (formatDateTime(item.start) !== formatDateTime(event.getStartTime())) {
            return false;
        }
        if (formatDateTime(item.end) !== formatDateTime(event.getEndTime())) {
            return false;
        }
    }
    return true;
}

function formatDate(d: GoogleAppsScript.Base.Date): string {
    return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd')
}

function formatDateTime(d: GoogleAppsScript.Base.Date): string {
    return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')
}

function formatEvent(event: CalendarEvent): string {
    const arr: string[] = [];
    arr.push(event.getTitle());
    arr.push(event.getDescription() || '*');
    if (event.isAllDayEvent()) {
        arr.push(formatDate(event.getAllDayStartDate()));
        arr.push("...");
        const end = (new Date());
        end.setTime(event.getAllDayEndDate().getTime() - 1);
        arr.push(formatDate(end));
    } else {
        arr.push(formatDate(event.getStartTime()));
        arr.push("...");
        arr.push(formatDate(event.getEndTime()));
    }
    return arr.join(" ");
}

function formatItem(item: JsonItem): string {
    const arr: string[] = [];
    arr.push(item.title);
    arr.push(item.description || '-');
    if (item.noTime) {
        arr.push(formatDate(item.start));
        arr.push("...");
        arr.push(formatDate(item.end));
    } else {
        arr.push(formatDate(item.start));
        arr.push("...");
        arr.push(formatDate(item.end));
    }
    return arr.join(" ");
}
