import { Thread } from "@/lib/api";
import { Button } from "./ui/button";
import { MessageCircle } from "lucide-react";

export function ThreadList({ threads, onSelect, currentThread }: {
    threads: Thread[];
    onSelect: (thread: Thread) => void;
    currentThread: Thread | null;
}) {
    return (
        <div className="w-64 border-r h-full overflow-y-auto">
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Threads</h2>
                <div className="space-y-2">
                    {threads.map((thread) => (
                        <Button
                            key={thread.id}
                            variant={currentThread?.id === thread.id ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => onSelect(thread)}
                        >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            {thread.title}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}