import React, { useEffect, useState, useRef } from 'react';
import io from "socket.io-client";
import Peer from "simple-peer";
import Navigation from './Components/Navigation'
import Footer from './Components/Footer'
import Rodal from 'rodal'
import  'rodal/lib/rodal.css'

import camera from './Icons/camera.svg'
import camerastop from './Icons/camera-stop.svg'
import microphone from './Icons/microphone.svg'
import microphonestop from './Icons/microphone-stop.svg'
import share from './Icons/share.svg'
import hangup from './Icons/hang-up.svg'

function App() {
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callingFriend, setCallingFriend] = useState(false);
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callRejected, setCallRejected] = useState(false);
  const [receiverID, setReceiverID] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [audioMuted, setAudioMuted] = useState(false)
  const [videoMuted, setVideoMuted] = useState(false)
  
  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();
  const myPeer=useRef();

  let landingHTML=<>
    <Navigation/>
    <main>
      <div className="u-margin-top-xxlarge u-margin-bottom-xxlarge">
    <div className="o-wrapper-l">
        <div className="hero flex flex-column">
            <div>
                <div className="welcomeText">
                    Anonymous Video Calls
                </div>
                <div className="descriptionText">
                    across the world for free
                </div>
            </div>
            <div>
                <div className="actionText">Who do you want to call, <span className="username highlight">{yourID}</span>?</div>
            </div>
            <div className="callBox flex">
                <input type="text" placeholder="Friend ID" value={receiverID} onChange={e => setReceiverID(e.target.value)} className="form-input"/>
                <button onClick={() => callPeer(receiverID)} className="primaryButton">Call</button>
            </div>
            <div>
                To call your friend, ask them to open Cuckoo in their browser. <br/>
                Send your username (<span className="username">{yourID}</span>) and wait for their call <span style={{fontWeight: 600}}>OR</span> enter their username and hit call!
            </div>
        </div>
    </div>
    </div>
    </main>
    <Footer/>
  </>

  useEffect(() => {
    socket.current = io.connect("/");
    

    socket.current.on("yourID", (id) => {
      setYourID(id);
    })
    socket.current.on("allUsers", (users) => {
      setUsers(users);
    })

    socket.current.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    })
  }, []);

  function callPeer(id) {
    if(id!=='' && users[id] && id!==yourID){
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        setStream(stream);
        setCallingFriend(true)
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
        const peer = new Peer({
          initiator: true,
          trickle: false,
          config: {
    
            iceServers: [
                {
                    urls: "stun:numb.viagenie.ca",
                    username: "sultan1640@gmail.com",
                    credential: "98376683"
                },
                {
                    urls: "turn:numb.viagenie.ca",
                    username: "sultan1640@gmail.com",
                    credential: "98376683"
                }
            ]
        },
          stream: stream,
        });

        myPeer.current=peer;
    
        peer.on("signal", data => {
          socket.current.emit("callUser", { userToCall: id, signalData: data, from: yourID })
        })
    
        peer.on("stream", stream => {
          if (partnerVideo.current) {
            partnerVideo.current.srcObject = stream;
          }
        });

        peer.on('error', (err)=>{
          endCall()
        })
    
        socket.current.on("callAccepted", signal => {
          setCallAccepted(true);
          peer.signal(signal);
        })

        socket.current.on('close', ()=>{
          window.location.reload()
        })
  
        socket.current.on('rejected', ()=>{
          window.location.reload()
        })
      })
      .catch(()=>{
        setModalMessage('You cannot place/ receive a call without granting video and audio permissions! Please change your settings to use Cuckoo.')
        setModalVisible(true)
      })
    } else {
      setModalMessage('We think the username entered is wrong. Please check again and retry!')
      setModalVisible(true)
      return
    }
  }

  function acceptCall() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
      setCallAccepted(true);
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream,
      });

      myPeer.current=peer

      peer.on("signal", data => {
        socket.current.emit("acceptCall", { signal: data, to: caller })
      })

      peer.on("stream", stream => {
        partnerVideo.current.srcObject = stream;
      });

      peer.on('error', (err)=>{
        endCall()
      })

      peer.signal(callerSignal);

      socket.current.on('close', ()=>{
        window.location.reload()
      })
    })
    .catch(()=>{
      setModalMessage('You cannot place/ receive a call without granting video and audio permissions! Please change your settings to use Cuckoo.')
      setModalVisible(true)
    })
  }

  function rejectCall(){
    setCallRejected(true)
    socket.current.emit('rejected', {to:caller})
    window.location.reload()
  }

  function endCall(){
    myPeer.current.destroy()
    socket.current.emit('close',{to:caller})
    window.location.reload()
  }

  function shareScreen(){
    navigator.mediaDevices.getDisplayMedia({cursor:true})
    .then(screenStream=>{
      myPeer.current.replaceTrack(stream.getVideoTracks()[0],screenStream.getVideoTracks()[0],stream)
      userVideo.current.srcObject=screenStream
      screenStream.getTracks()[0].onended = () =>{
      myPeer.current.replaceTrack(screenStream.getVideoTracks()[0],stream.getVideoTracks()[0],stream)
      userVideo.current.srcObject=stream
      }
    })
  }

  function toggleMuteAudio(){
    if(stream){
      setAudioMuted(!audioMuted)
      stream.getAudioTracks()[0].enabled = audioMuted
    }
  }

  function toggleMuteVideo(){
    if(stream){
      setVideoMuted(!videoMuted)
      stream.getVideoTracks()[0].enabled = videoMuted
    }
  }

  function renderLanding() {
    if(!callRejected && !callAccepted && !callingFriend)
      return 'block'
    return 'none'
  }

  function renderCall() {
    if(!callRejected && !callAccepted && !callingFriend)
      return 'none'
    return 'block'
  }

  let UserVideo;
  if (stream) {
    UserVideo = (
      <video className="userVideo" playsInline muted ref={userVideo} autoPlay />
    );
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = (
      <video className="partnerVideo" playsInline ref={partnerVideo} autoPlay />
    );
  }

  let incomingCall;
  if (receivingCall && !callAccepted && !callRejected) {
    incomingCall = (
      <div className="incomingCallContainer">
        <div className="incomingCall flex flex-column">
          <div><span className="callerID">{caller}</span> is calling you!</div>
          <div className="incomingCallButtons flex">
          <button name="accept" className="alertButtonPrimary" onClick={()=>acceptCall()}>Accept</button>
          <button name="reject" className="alertButtonSecondary" onClick={()=>rejectCall()}>Reject</button>
          </div>
        </div>
      </div>
    )
  }

  let audioControl;
  if(audioMuted){
    audioControl=<span className="iconContainer" onClick={()=>toggleMuteAudio()}>
      <img src={microphonestop} alt="Unmute audio"/>
    </span>
  } else {
    audioControl=<span className="iconContainer" onClick={()=>toggleMuteAudio()}>
      <img src={microphone} alt="Mute audio"/>
    </span>
  }

  let videoControl;
  if(videoMuted){
    videoControl=<span className="iconContainer" onClick={()=>toggleMuteVideo()}>
      <img src={camerastop} alt="Resume video"/>
    </span>
  } else {
    videoControl=<span className="iconContainer" onClick={()=>toggleMuteVideo()}>
      <img src={camera} alt="Stop audio"/>
    </span>
  }

  let screenShare=<span className="iconContainer" onClick={()=>shareScreen()}>
    <img src={share} alt="Share screen"/>
  </span>

  let hangUp=<span className="iconContainer" onClick={()=>endCall()}>
    <img src={hangup} alt="End call"/>
  </span>

  return (
    <>
      <div style={{display: renderLanding()}}>
        {landingHTML}
        <Rodal 
          visible={modalVisible} 
          onClose={()=>setModalVisible(false)} 
          width={20} 
          height={5} 
          measure={'em'}
          closeOnEsc={true}
        >
          <div>{modalMessage}</div>
        </Rodal>
        {incomingCall}
      </div>
      <div className="callContainer" style={{display: renderCall()}}>
        <div className="partnerVideoContainer">
          {PartnerVideo}
        </div>
        <div className="userVideoContainer">
          {UserVideo}
        </div>
        <div className="controlsContainer flex">
          {audioControl}
          {videoControl}
          {screenShare}
          {hangUp}
        </div>
      </div>
    </>
  )
}

export default App;