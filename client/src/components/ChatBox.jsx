import { memo, useEffect, useRef, useState } from "react";

function ChatBox({ messages, onSend, disabled }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();

    if (!text.trim() || disabled) {
      return;
    }

    await onSend(text);
    setText("");
  }

  return (
    <section className="panel chat-card">
      <h3>Live Chat</h3>

      <div className="chat-log" ref={listRef}>
        {messages.length === 0 ? (
          <p className="muted">No messages yet. Say hello.</p>
        ) : (
          messages.map((msg) => (
            <article className="chat-message" key={`${msg.id || msg.timestamp}-${msg.username}`}>
              <div className="chat-meta">
                <strong>{msg.username}</strong>
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <p>{msg.message}</p>
            </article>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          className="input"
          placeholder="Type message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
        />
        <button className="btn btn-primary" type="submit" disabled={disabled}>
          Send
        </button>
      </form>
    </section>
  );
}

export default memo(ChatBox);
