import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <main>
      <div className="wrap prose">
        <h1>Congestion control algorithms</h1>
        <p>
          Placeholder for the experiment landing page. Later tasks add the aim,
          theory, and network design sections.
        </p>
        <p>
          <Link className="btn" to="/simulator">
            Open the simulator
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  )
}
