const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  // const localStream = await navigator.mediaDevices
  //   .getUserMedia({
  //     // audio: true,
  //     video: {
  //       frameRate : { max: 10 }
  //     },
  //   })
  //   .catch(console.error);

  // Render local stream
  // localVideo.muted = true;
  // localVideo.srcObject = localStream;
  // localVideo.playsInline = true;
  // await localVideo.play().catch(console.error);

  const peer = (window.peer = new Peer({
    key: '64dea4a9-c508-4de4-94a5-153965fee9c9',
    debug: 3,
  }));

  // Register caller handler
  callTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const mediaConnection = peer.call(remoteId.value, null, {
      videoCodec: 'H264'
    });

    mediaConnection.on('stream', async stream => {
      console.log('mediaConnection.stream', stream)
      // Render remote stream for caller
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      console.log('mediaConnection.close')
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.once('open', id => (localId.textContent = id));

  // Register callee handler
  peer.on('call', mediaConnection => {
    mediaConnection.close(true)
    // mediaConnection.answer(localStream);

    // mediaConnection.on('stream', async stream => {
    //   // Render remote stream for callee
    //   remoteVideo.srcObject = stream;
    //   remoteVideo.playsInline = true;
    //   await remoteVideo.play().catch(console.error);
    // });

    // mediaConnection.once('close', () => {
    //   remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    //   remoteVideo.srcObject = null;
    // });

    // closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.on('error', console.error);
})();
