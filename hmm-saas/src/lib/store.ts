"use client";

import { Bot, Ticket, generateBots, generateTickets } from "./demo-data";

// Simple client-side store
let _bots: Bot[] | null = null;
let _tickets: Ticket[] | null = null;
let _listeners: (() => void)[] = [];

export function getBots(): Bot[] {
  if (!_bots) _bots = generateBots();
  return _bots;
}

export function getTickets(): Ticket[] {
  if (!_tickets) _tickets = generateTickets(getBots());
  return _tickets;
}

export function updateBot(id: string, updates: Partial<Bot>) {
  const bots = getBots();
  const idx = bots.findIndex(b => b.id === id);
  if (idx >= 0) {
    Object.assign(bots[idx], updates, { updated: new Date().toISOString().slice(0,10) });
    notify();
  }
}

export function addTicket(ticket: Omit<Ticket, "id" | "created" | "updated" | "comments">) {
  const tickets = getTickets();
  const id = "ISSUE-" + String(tickets.length + 1).padStart(3, "0");
  tickets.unshift({
    ...ticket,
    id,
    comments: [],
    created: new Date().toISOString().slice(0,10),
    updated: new Date().toISOString().slice(0,10),
  });
  notify();
}

export function updateTicket(id: string, updates: Partial<Ticket>) {
  const tickets = getTickets();
  const idx = tickets.findIndex(t => t.id === id);
  if (idx >= 0) {
    Object.assign(tickets[idx], updates, { updated: new Date().toISOString().slice(0,10) });
    notify();
  }
}

export function addTicketComment(ticketId: string, author: string, text: string) {
  const tickets = getTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  if (ticket) {
    ticket.comments.push({ author, date: new Date().toISOString().slice(0,10), text });
    notify();
  }
}

export function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter(l => l !== listener); };
}

function notify() {
  _listeners.forEach(l => l());
}
