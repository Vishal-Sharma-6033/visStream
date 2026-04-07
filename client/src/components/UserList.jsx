import { memo } from "react";

function UserList({ users = [], host, currentUser }) {
  return (
    <aside className="panel users-card">
      <div className="users-head">
        <h3>Users</h3>
        <span className="muted">{users.length}</span>
      </div>

      <ul className="users-list">
        {users.map((member) => {
          const isHost = member.username === host;
          const isYou = member.username === currentUser;

          return (
            <li key={`${member.socketId}-${member.username}`} className="users-item">
              <span>{member.username}</span>
              <div className="chips">
                {isHost ? <span className="chip host">Host</span> : null}
                {isYou ? <span className="chip">You</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default memo(UserList);
