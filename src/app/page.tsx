'use client';

import { useState } from 'react';
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function Home() {
  const [context, setContext] = useState('');
  const [conversation, setConversation] = useState('');
  const [loading, setLoading] = useState(false);
  const [memeUrl, setMemeUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!context && !conversation) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, conversation }),
      });
      
      const data = await res.json();
      
      console.log('--- MEME GENERATION DEBUG INFO ---');
      console.log('1. User Inputs:', data.debug_info?.user_inputs);
      console.log('2. LLM System Instruction:', data.debug_info?.llm_system_instruction);
      console.log('3. LLM User Prompt:', data.debug_info?.llm_input_prompt);
      console.log('4. LLM Raw JSON Output:', data.debug_info?.llm_raw_output);
      console.log('----------------------------------');

      if (data.success) {
        setMemeUrl(data.imageUrl);
      } else {
        alert('Error: ' + data.error);
        console.error("Server Error Details:", data.debug_info?.raw_error);
      }
    } catch (err) {
      alert('Failed to generate meme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Contextual Meme Generator
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Paste your chat history, and let AI pick the perfect meme.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Column: Inputs */}
            <div className="p-8 space-y-6 bg-white">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What is the context? (Optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border text-black bg-white"
                  placeholder="e.g., We are arguing about whether hotdogs are sandwiches..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat Conversation
                </label>
                <textarea
                  rows={8}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border font-mono text-sm text-black bg-white"
                  placeholder="Alice: Hotdogs are sandwiches.&#10;Bob: No they aren't, they are tacos.&#10;Alice: You're crazy."
                  value={conversation}
                  onChange={(e) => setConversation(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || (!context && !conversation)}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Generating Meme...
                  </>
                ) : (
                  <>
                    <Send className="-ml-1 mr-2 h-5 w-5" />
                    Generate Meme
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Output */}
            <div className="p-8 bg-gray-50 border-l border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
              {memeUrl ? (
                <div className="space-y-4 w-full text-center">
                  <h3 className="text-sm font-medium text-gray-500">Result</h3>
                  <div className="relative rounded-lg overflow-hidden shadow-lg border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={memeUrl} alt="Generated Meme" className="w-full h-auto object-contain" />
                  </div>
                  <a
                    href={memeUrl}
                    download="meme.png"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Download Image
                  </a>
                </div>
              ) : (
                <div className="text-center text-gray-400 space-y-4">
                  <ImageIcon className="mx-auto h-16 w-16 text-gray-300" />
                  <p className="text-sm">Your generated meme will appear here</p>
                </div>
              )}
            </div>
            
          </div>
        </div>
        
      </div>
    </main>
  );
}
