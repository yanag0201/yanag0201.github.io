const Peer = window.Peer;

(async function main() {
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');

  roomMode.textContent = getRoomModeByHash();
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  var videos = {};

  joinTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const room = peer.joinRoom(roomId.value, {
      mode: getRoomModeByHash(),
      // stream: localStream,
    });

    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      // newVideo.setAttribute('data-peer-id', stream.peerId);
      videos[stream.peerId] = newVideo;
      // remoteVideos.append(newVideo);
      setupPanorama(newVideo, stream.peerId);
      await newVideo.play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      // remove video
      const remoteVideo = videos[peerId];
      if (remoteVideo) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
        delete videos[peerId];
      }
      const remoteRenderer = remoteVideos.querySelector(
        `[renderer-data-peer-id=${peerId}]`
      );
      if (remoteRenderer) {
        remoteRenderer.remove();
      }

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';

      // remove all videos
      Object.keys(videos).forEach((peerId) => {
        videos[peerId].srcObject.getTracks().forEach(track => track.stop());
        videos[peerId].srcObject = null;
        videos[peerId].remove();
      });
      videos = {};

      Array.from(remoteVideos.children).forEach(remoteRenderer => {
        remoteRenderer.remove();
      });
    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }

    function setupPanorama(video, peerId) {
      var width = 640;
      var height = 320;

      // scene
      var scene = new THREE.Scene();

      // mesh
      var geometry = new THREE.SphereGeometry(5, 60, 40);
      geometry.scale(- 1, 1, 1);

      // video
      var texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;

      var material = new THREE.MeshBasicMaterial({ map: texture });
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);

      // camera
      var camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
      camera.position.set(0, 0, 0.1);
      camera.lookAt(sphere.position);

      // helper
      var axis = new THREE.AxisHelper(1000);
      axis.position.set(0, 0, 0);
      scene.add(axis);

      // render
      var renderer = new THREE.WebGLRenderer();
      renderer.setSize(width, height);
      renderer.setClearColor({ color: 0x000000 });
      // document.getElementById('stage').appendChild(renderer.domElement);
      renderer.domElement.setAttribute('renderer-data-peer-id', peerId);
      remoteVideos.append(renderer.domElement);

      renderer.render(scene, camera);

      // control
      var controls = new THREE.OrbitControls(camera, renderer.domElement);

      // render
      var render = function () {
        requestAnimationFrame(render);
        renderer.render(scene, camera);
        controls.update();
      }

      render();
    }
  });

  peer.on('error', console.error);
})();
