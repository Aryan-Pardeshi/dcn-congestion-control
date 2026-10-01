import './Footer.css'

export default function Footer({ children }) {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <p>Data Communication &amp; Networks lab — Module 4.2, The Network Layer in the Internet</p>
        {children}
      </div>
    </footer>
  )
}
