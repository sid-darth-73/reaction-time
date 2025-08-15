import { useState, useEffect, useRef } from "react";

export default function App() {
  const [color, setColor] = useState("blue");
  const [message, setMessage] = useState("Press SPACE or TAP to start");
  const [reactionTime, setReactionTime] = useState(null);
  const [times, setTimes] = useState([]);
  const [username, setUsername] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [bestTime, setBestTime] = useState(null);

  const [showRestartButton, setShowRestartButton] = useState(false);
  const [finalAverage, setFinalAverage] = useState(null);

  const phaseRef = useRef("idle");
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const gameAreaRef = useRef(null);

  const startGame = () => {

    if (phaseRef.current === "gameover") return;

    if (phaseRef.current === "idle") {
      setColor("red");
      setMessage("Wait for green...");
      setReactionTime(null);
      phaseRef.current = "waiting";

      const delay = Math.floor(Math.random() * 5500) + 3500;
      timerRef.current = setTimeout(() => {
        setColor("green");
        setMessage("GO!");
        startTimeRef.current = Date.now();
        phaseRef.current = "ready";
      }, delay);

    } else if (phaseRef.current === "ready") {
      const endTime = Date.now();
      const time = endTime - startTimeRef.current;
      setReactionTime(time);

      const updatedTimes = [...times, time];
      setTimes(updatedTimes);

      if (updatedTimes.length === 3) {
        const avg = updatedTimes.reduce((sum, t) => sum + t, 0) / updatedTimes.length;
        setMessage(`Average: ${avg.toFixed(2)} ms`);
        setFinalAverage(avg); // Save average for the button
        setShowRestartButton(true); // Show the restart button
        phaseRef.current = "gameover"; // Pause the game
      } else {
        setMessage(`Run ${updatedTimes.length}/3 done. Press SPACE or TAP for next.`);
        phaseRef.current = "idle";
      }
      setColor("blue");

    } else if (phaseRef.current === "waiting") {
      clearTimeout(timerRef.current);
      setMessage("Too soon! Press SPACE or TAP to try again");
      setColor("blue");
      phaseRef.current = "idle";
    }
  };

  const handleRestart = () => {
    if (finalAverage === null) return;

    // Send the final average to the backend
    sendAverage(finalAverage);

    // Reset all game states
    setShowRestartButton(false);
    setFinalAverage(null);
    setTimes([]);
    setReactionTime(null);
    setMessage("Press SPACE or TAP to start");
    phaseRef.current = "idle";
  };


  const sendAverage = async (avg) => {
    if (!loggedIn || !username) return;
    try {
      const res = await fetch("http://localhost:3002/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, reactionTime: avg }),
      });
      if (!res.ok) throw new Error('Server responded with an error');
      
      const data = await res.json();
      console.log("Server:", data);

      // Update UI with new best time if it's better
      if (bestTime === null || avg < bestTime) {
        setBestTime(avg.toFixed(2));
      }
    } catch (err) {
      console.error("Failed to send data:", err);
    }
  };

  const handleLogin = async () => {
    if (!username) return alert("Enter username first");
    try {
      const res = await fetch("http://localhost:3002/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.status === 404) {
        return alert("User not found. Please register first.");
      }
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      setLoggedIn(true);
      alert(`Logged in! Your best time: ${data.reactionTime} ms`);
      setBestTime(data.reactionTime);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async () => {
    if (!username) return alert("Enter username first");
    try {
      const res = await fetch("http://localhost:3002/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const data = await res.json();
        return alert(data.message || "Registration failed");
      }
      alert("User registered! Now log in.");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      startGame();
    };

    const handleTouchOrClick = (e) => {
      if (!gameAreaRef.current?.contains(e.target)) return;
      e.preventDefault();
      startGame();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleTouchOrClick);
    document.addEventListener("touchstart", handleTouchOrClick, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleTouchOrClick);
      document.removeEventListener("touchstart", handleTouchOrClick);
      clearTimeout(timerRef.current);
    };
  }, [times]); // Re-added `times` to ensure the logic inside the effect has the latest version

  return (
    <div
      style={{
        backgroundColor: "#222",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        fontSize: "2rem",
        userSelect: "none",
        paddingTop: "1rem",
      }}
    >
      {/* login form */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Enter username (optional)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: "0.5rem", fontSize: "1rem", marginRight: "0.5rem" }}
        />
        <button onClick={handleLogin} disabled={loggedIn}>Login</button>
        <button onClick={handleRegister} disabled={loggedIn}>Register</button>
        {loggedIn && (
          <p style={{ marginTop: "0.5rem" }}>
            Best Time: {bestTime !== null ? `${bestTime} ms` : "N/A"}
          </p>
        )}
      </div>

      {/* game area */}
      <div
        ref={gameAreaRef}
        style={{
          backgroundColor: color,
          flex: "1",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p>{message}</p>
        {reactionTime !== null && <p>Reaction Time: {reactionTime} ms</p>}
        
        {/* restart button */}
        {showRestartButton && (
          <button 
            onClick={handleRestart}
            style={{ 
              fontSize: '1.5rem', 
              padding: '10px 20px', 
              marginTop: '20px',
              cursor: 'pointer' 
            }}
          >
            Restart & Save Score
          </button>
        )}
      </div>
    </div>
  );
}