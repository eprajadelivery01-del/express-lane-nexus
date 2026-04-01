import { Bell, ChevronDown, Send, Mic } from "lucide-react";

const notifications = [
  {
    id: "1",
    icon: "🏍️",
    title: "Pedido atribuído a Motoboy 1!",
    description: "Pedido #123 atribuído ao Motoboy 1.",
    time: "há 2 min.",
  },
  {
    id: "2",
    icon: "🏪",
    title: "Novo pedido de Farmácia Y!",
    description: "Novo pedido aguardando atribuição.",
    time: "há 5 min.",
  },
  {
    id: "3",
    icon: "⚠️",
    title: "Motoboy 4 está offline!",
    description: "Motoboy 4 ficou offline há 10m.",
    time: "há 10 min.",
  },
];

const chatMessages = [
  {
    id: "1",
    sender: "Central",
    text: "Peguei o Pedido #123 e tô a caminho da Farmácia Y!",
    time: "há 3 min.",
    isOwn: true,
  },
  {
    id: "2",
    sender: "Motoboy",
    text: "Beleza, avisa quando concluir a coleta",
    time: "há 3 min.",
    isOwn: false,
  },
];

export function NotificationsPanel() {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      {/* Notifications */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-warning" />
            <h3 className="font-display font-semibold text-foreground text-sm">Notificações</h3>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="divide-y divide-border">
          {notifications.map(n => (
            <div key={n.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm">
                {n.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{n.title}</p>
                <p className="text-[11px] text-muted-foreground">{n.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="border-t border-border">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs">💬</span>
            </div>
            <h3 className="font-display font-semibold text-foreground text-sm">Chat</h3>
          </div>
        </div>

        <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  msg.isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.isOwn && (
                  <p className="text-[10px] font-bold opacity-80 mb-0.5">{msg.sender}</p>
                )}
                <p className="text-xs">{msg.text}</p>
                <p className={`text-[10px] mt-0.5 ${msg.isOwn ? "opacity-70" : "text-muted-foreground"}`}>{msg.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-muted rounded-full px-4 py-2 text-xs outline-none placeholder:text-muted-foreground"
            />
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Send className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Mic className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
