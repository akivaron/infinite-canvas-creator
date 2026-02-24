import * as React from "react";
import { Check, ChevronsUpDown, Cpu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCanvasStore } from "@/stores/canvasStore";

interface ModelSelectorProps {
  className?: string;
  showAuto?: boolean;
  nodeId?: string;
}

export function ModelSelector({ className, showAuto = true, nodeId }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const { aiModel: globalAiModel, setAiModel: setGlobalAiModel, availableModels, nodes, updateNode } = useCanvasStore();

  const currentNode = React.useMemo(() => 
    nodeId ? nodes.find(n => n.id === nodeId) : null
  , [nodes, nodeId]);

  const aiModel = nodeId ? (currentNode?.aiModel || "auto") : globalAiModel;

  const setAiModel = (model: string) => {
    if (nodeId) {
      updateNode(nodeId, { aiModel: model });
    } else {
      setGlobalAiModel(model);
    }
  };

  const selectedModelName = React.useMemo(() => {
    if (aiModel === "auto") return "Auto (Balanced)";
    const model = availableModels.find((m) => m.id === aiModel);
    return model ? model.name : aiModel;
  }, [aiModel, availableModels]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-secondary/30 border-border h-9 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-secondary/50 transition-all border-dashed px-3",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {aiModel === "auto" ? (
              <Zap className="w-3 h-3 text-primary" />
            ) : (
              <Cpu className="w-3 h-3 text-primary" />
            )}
            <span className="truncate">{selectedModelName}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 rounded-2xl border-border bg-card shadow-2xl overflow-hidden">
        <Command className="bg-card">
          <CommandInput 
            placeholder="Search AI models..." 
            className="h-9 text-[10px] font-bold uppercase tracking-widest border-none focus:ring-0"
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="text-[10px] font-bold uppercase tracking-widest py-6 text-muted-foreground text-center">
              No model found.
            </CommandEmpty>
            <CommandGroup>
              {showAuto && (
                <CommandItem
                  value="auto"
                  onSelect={() => {
                    setAiModel("auto");
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-between cursor-pointer py-2.5 px-3 aria-selected:bg-primary/10"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>Auto (Balanced)</span>
                  </div>
                  {aiModel === "auto" && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              )}
              
              {availableModels.length > 0 ? (
                availableModels.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.id}
                    onSelect={() => {
                      setAiModel(model.id);
                      setOpen(false);
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-between cursor-pointer py-2.5 px-3 aria-selected:bg-primary/10"
                  >
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        model.free ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-primary"
                      )} />
                      <div className="flex flex-col truncate">
                        <span className="truncate">{model.name}</span>
                        <span className="text-[8px] opacity-50 truncate">{model.id}</span>
                      </div>
                    </div>
                    {aiModel === model.id && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
                  </CommandItem>
                ))
              ) : (
                <>
                  {[
                    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
                    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
                    { id: "openai/gpt-4o", name: "GPT-4o" },
                    { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick" },
                  ].map((fallback) => (
                    <CommandItem
                      key={fallback.id}
                      value={fallback.id}
                      onSelect={() => {
                        setAiModel(fallback.id);
                        setOpen(false);
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-between cursor-pointer py-2.5 px-3 aria-selected:bg-primary/10"
                    >
                      <div className="flex flex-col truncate">
                        <span>{fallback.name}</span>
                        <span className="text-[8px] opacity-50 truncate">{fallback.id}</span>
                      </div>
                      {aiModel === fallback.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </CommandItem>
                  ))}
                </>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
