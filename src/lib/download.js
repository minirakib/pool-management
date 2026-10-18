function save(filename, blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export function csvDownload(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  save(filename, new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
}

export function jsonDownload(filename, data) {
  save(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}
