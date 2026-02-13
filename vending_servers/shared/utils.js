'use strict';

function parseTopic(topic) {
  // <prefix>/<machineId>/<metric...>
  const parts = topic.split('/');
  if (parts.length < 3) return null;

  const prefix = parts[0];
  const machineId = parts[1];
  const metric = parts.slice(2).join('/');

  return { prefix, machineId, metric };
}

function parsePayload(buf) {
  const text = buf.toString('utf8').trim();

  // JSON
  if (
    (text.startsWith('{') && text.endsWith('}')) ||
    (text.startsWith('[') && text.endsWith(']'))
  ) {
    try {
      return { value: JSON.parse(text), rawType: 'json', numericValue: undefined };
    } catch (_) {}
  }

  // Number
  const num = Number(text);
  if (Number.isFinite(num) && text !== '') {
    return { value: num, rawType: 'number', numericValue: num };
  }

  // String
  return { value: text, rawType: 'string', numericValue: undefined };
}

module.exports = { parseTopic, parsePayload };
