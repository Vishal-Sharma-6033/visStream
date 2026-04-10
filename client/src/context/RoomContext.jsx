import React, { createContext, useContext, useReducer, useCallback } from 'react';

const RoomContext = createContext(null);

const initialState = {
  room:          null,
  members:       [],
  messages:      [],
  isHost:        false,
  playbackState: { playing: false, currentTime: 0 },
  typingUsers:   [],
};

const roomReducer = (state, action) => {
  switch (action.type) {
    case 'SET_ROOM':         return { ...state, room: action.payload };
    case 'SET_MEMBERS':      return { ...state, members: action.payload };
    case 'SET_IS_HOST':      return { ...state, isHost: action.payload };
    case 'ADD_MESSAGE':      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_MESSAGES':     return { ...state, messages: action.payload };
    case 'SET_PLAYBACK':     return { ...state, playbackState: { ...state.playbackState, ...action.payload } };
    case 'SET_TYPING': {
      const { username, isTyping } = action.payload;
      return {
        ...state,
        typingUsers: isTyping
          ? [...new Set([...state.typingUsers, username])]
          : state.typingUsers.filter((u) => u !== username),
      };
    }
    case 'RESET': return initialState;
    default: return state;
  }
};

export const RoomProvider = ({ children }) => {
  const [state, dispatch] = useReducer(roomReducer, initialState);
  const setRoom      = useCallback((r)  => dispatch({ type: 'SET_ROOM',     payload: r  }), []);
  const setMembers   = useCallback((m)  => dispatch({ type: 'SET_MEMBERS',  payload: m  }), []);
  const setIsHost    = useCallback((v)  => dispatch({ type: 'SET_IS_HOST',  payload: v  }), []);
  const addMessage   = useCallback((msg)=> dispatch({ type: 'ADD_MESSAGE',  payload: msg}), []);
  const setMessages  = useCallback((ms) => dispatch({ type: 'SET_MESSAGES', payload: ms }), []);
  const setPlayback  = useCallback((p)  => dispatch({ type: 'SET_PLAYBACK', payload: p  }), []);
  const setTyping    = useCallback((p)  => dispatch({ type: 'SET_TYPING',   payload: p  }), []);
  const resetRoom    = useCallback(()   => dispatch({ type: 'RESET'                      }), []);

  return (
    <RoomContext.Provider value={{ ...state, setRoom, setMembers, setIsHost, addMessage, setMessages, setPlayback, setTyping, resetRoom }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider');
  return ctx;
};
