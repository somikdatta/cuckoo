import React from 'react'
import './Footer.css'

function Footer() {

    return (
        <footer className="footerWrapper">
            <div className="footerContainer">
                <div className="disclaimer">
                    You need to allow access to video and audio to place calls.<br/>
                    Cuckoo is fully Open Source and does not store any data on its servers.
                </div>
                <div className="self">
                    Made with <span role='img' aria-label='heart-emoji'>❤️</span> in India by <a href="https://www.somikdatta.com" target="_blank" rel="noopener noreferrer">Somik Datta</a>
                </div>
            </div>
        </footer>
    )

}

export default Footer