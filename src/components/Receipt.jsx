import { durationLabel, money, monthLabel, shortDate, timeLabel } from "@/lib/format.js";

/** The club logo on top of printed receipts, unless turned off in Settings → Club profile. */
const ReceiptLogo = ({ settings }) => (settings.logo && settings.logoOnReceipt !== false ? <img className="receipt-logo" src={settings.logo} alt="" /> : null);

const Row = ({ label, value, className = "" }) => (
  <div className={`receipt-row ${className}`}><span>{label}</span><span>{value}</span></div>
);

/** 80 mm payslip for a salary entry (details.payslip = true). */
function Payslip({ details: d, settings }) {
  return (
    <>
      <ReceiptLogo settings={settings} />
      <h1>{settings.clubName}</h1>
      <div className="receipt-center">{settings.address}<br />{settings.phone}<br /><strong>PAYSLIP · {monthLabel(d.month).toUpperCase()}</strong></div>
      <div className="receipt-rule"></div>
      <Row label="Staff" value={d.staffName} />
      <Row label="Role" value={d.role} />
      {d.phone && <Row label="Phone" value={d.phone} />}
      <div className="receipt-rule"></div>
      <Row label="Base salary" value={money(d.base)} />
      {d.bonus ? <Row label="Bonus" value={money(d.bonus)} /> : null}
      {d.overtime ? <Row label="Overtime" value={money(d.overtime)} /> : null}
      {d.deduction ? <Row label="Deduction" value={`−${money(d.deduction)}`} /> : null}
      {d.advance ? <Row label="Advance" value={`−${money(d.advance)}`} /> : null}
      <div className="receipt-rule"></div>
      <Row label="NET PAY" value={money(d.net)} className="receipt-total" />
      <Row label="Status" value={d.status === "Paid" ? `Paid ${shortDate(d.paidOn)}` : "Pending"} />
      {d.method && <Row label="Method" value={d.method} />}
      <div className="receipt-rule"></div>
      <div className="receipt-center">Received by ____________________</div>
    </>
  );
}

/** 80 mm receipt, same layout as the original receiptMarkup(). Only visible when printing. */
export default function Receipt({ details, settings }) {
  if (details.payslip) return <Payslip details={details} settings={settings} />;
  return (
    <>
      <ReceiptLogo settings={settings} />
      <h1>{settings.clubName}</h1>
      <div className="receipt-center">{settings.address}<br />{settings.phone}<br /><strong>RECEIPT · DEMO</strong></div>
      <div className="receipt-rule"></div>
      <Row label="Table / sale" value={details.tableName} />
      {details.category && <Row label="Category" value={details.category} />}
      <Row label="Customer" value={details.customer} />
      {details.startedAt && <Row label="Start" value={timeLabel(details.startedAt)} />}
      <Row label="Closed" value={`${timeLabel(details.endedAt)} · ${shortDate(new Date(details.endedAt).toISOString().slice(0, 10))}`} />
      {details.rate ? <Row label="Rate" value={`${details.hourType === "nonac" ? "Non-AC" : "AC"} · ${money(details.rate)}/hr · ${details.billingMode === "hour" ? "started hour" : details.billingMode === "game" ? `single game ${details.gameMinutes ?? 15} min + extra min` : "per minute"}`} /> : null}
      {details.billingMode === "game" && details.duration ? <Row label="Extra minutes" value={`${Math.max(0, Math.floor((details.duration - (details.gameMinutes ?? 15) * 60_000) / 60_000))} min`} /> : null}
      {details.duration ? <Row label="Duration" value={durationLabel(details.duration)} /> : null}
      <div className="receipt-rule"></div>
      {details.tableCharge ? <Row label="Table time" value={money(details.tableCharge)} /> : null}
      {(details.products || []).map((item, i) => <Row key={i} label={`${item.name} ×${item.qty}`} value={money(item.price * item.qty)} />)}
      {details.previousBalance ? <Row label="Previous balance" value={money(details.previousBalance)} /> : null}
      {details.discount ? <Row label="Discount" value={`−${money(details.discount)}`} /> : null}
      <div className="receipt-rule"></div>
      <Row label="TOTAL" value={money(details.total)} className="receipt-total" />
      {details.split?.length > 1 && details.split.map((amount, i) => <Row key={`split-${i}`} label={`Player ${i + 1} of ${details.split.length}`} value={money(amount)} />)}
      <Row label="Payment" value={details.method} />
      <div className="receipt-rule"></div>
      <div className="receipt-center">Thank you for visiting<br />Keep your eye on the cue ball!</div>
    </>
  );
}
