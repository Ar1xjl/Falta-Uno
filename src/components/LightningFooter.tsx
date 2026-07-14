import qrImage from '../assets/lightning-qr.jpg'

export default function LightningFooter() {
  return (
    <div className="py-4 text-center" style={{ opacity: 0.6 }}>
      <a
        href="lightning:hodlear@walletofsatoshi.com"
        title="Tip via Lightning"
        className="inline-flex flex-col items-center gap-2"
      >
        <img
          src={qrImage}
          width={88}
          height={88}
          alt="Lightning QR — hodlear@walletofsatoshi.com"
          className="block rounded-lg border"
          style={{ borderColor: 'var(--color-line)' }}
        />
        <span className="hint" style={{ letterSpacing: '0.02em' }}>
          ⚡ Tip via Bitcoin Lightning &nbsp;·&nbsp;
          <span style={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>hodlear@walletofsatoshi.com</span>
        </span>
      </a>
    </div>
  )
}
