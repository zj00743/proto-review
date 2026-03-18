import { useState } from 'react';
import { MessageSquare } from 'lucide-react';

interface UserPromptProps {
  onSubmit: (name: string) => void;
}

export function UserPrompt({ onSubmit }: UserPromptProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
        <div className="flex items-center justify-center w-14 h-14 bg-gray-200 rounded-2xl mb-6 mx-auto">
          <MessageSquare className="w-7 h-7 text-gray-900" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Welcome to ProtoPreview
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Review prototypes and leave feedback with your team.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 mb-2">
            What should we call you?
          </label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-shadow"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full mt-4 px-4 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}
