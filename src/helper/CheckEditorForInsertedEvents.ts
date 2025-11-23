import type { Editor, EditorPosition, TFile } from "obsidian";
import type { GoogleEvent } from "./types";
import { getEvent } from "../googleApi/GoogleGetEvent";
import _ from "lodash";

async function getEventsInFile(fileContent: string): Promise<GoogleEvent[]> {

    let events = [];

    const regexForEventId = /^event-id: (.*)$/gm;
    const eventId = regexForEventId.exec(fileContent)?.[1];
    if (eventId) {
        const event = await getEvent(eventId);
        events.push(event);
    }

    const regexForLinks = /\[.*]\(https:\/\/www\.google\.com\/calendar\/event\?eid=(.*)&cal=(.*)\)/g;
    let matchesForLink;
    const outputForLink = [];

    do {
        matchesForLink = regexForLinks.exec(fileContent);
        if (matchesForLink) {
            outputForLink.push(matchesForLink);
        }
    } while (matchesForLink);

    if (!outputForLink.length) return events;

    events.push(...(await Promise.all(outputForLink.map(async (match) => {
        if (match) {
            const eventId = atob(match[1]).split(" ")[0];
            const event = await getEvent(eventId, match[2]);
            return event;
        }
    }))));

    return events;
}

// Cache to avoid re-reading file content unnecessarily
let lastFileContent: string | null = null;
let lastFileContentHash: number = 0;

export async function checkEditorForInsertedEvents(
    editor: Editor,
): Promise<void> {
    // Quick early return: check if file contains the pattern before expensive operations
    const currentLine = editor.getLine(editor.getCursor().line);
    const nearbyContent = editor.getRange(
        { line: Math.max(0, editor.getCursor().line - 5), ch: 0 },
        { line: Math.min(editor.lineCount() - 1, editor.getCursor().line + 5), ch: 999 }
    );
    
    // Only proceed if we see the pattern nearby
    if (!nearbyContent.includes("{{gEvent") && !nearbyContent.includes("}} ")) {
        return;
    }

    const cursorPosition = editor.getCursor();
    let fileContent = editor.getValue();

    // Simple hash to detect if content actually changed
    const contentHash = fileContent.length + (fileContent.match(/{{gEvent/g)?.length || 0);
    if (lastFileContent === fileContent && lastFileContentHash === contentHash) {
        return; // Content hasn't changed, skip processing
    }
    lastFileContent = fileContent;
    lastFileContentHash = contentHash;

    const regexForTemplates = /{{gEvent(\d?).(.*)}} /g;

    let matchesForTemplate;
    const outputForTemplate = [];

    do {
        matchesForTemplate = regexForTemplates.exec(fileContent);
        if (matchesForTemplate) {
            outputForTemplate.push(matchesForTemplate);
        }
    } while (matchesForTemplate);

    if (!outputForTemplate.length) return;

    const events = await getEventsInFile(fileContent);
    if (!events.length) return;

    outputForTemplate.forEach(async (match) => {

        const index = match[1] ? parseInt(match[1]) : 0;

        const startCursor: EditorPosition = editor.getCursor();
        startCursor.ch -= 3;

        //Check that the final whitespace was just typed to trigger the insert
        if (editor.getRange(startCursor, editor.getCursor()) != "}} ") {
            return false;
        }

        let newContent = _.get(events[index], match[2], "");
        //Turn objects into json for a better display be more specific in the template
        if (newContent === Object(newContent)) {
            newContent = JSON.stringify(newContent);
        }

        fileContent = fileContent.replace(match[0], newContent ?? "");

        editor.setValue(fileContent);

        cursorPosition.ch += (newContent.length - match[0].length);

        editor.setCursor(cursorPosition);
    });
}
