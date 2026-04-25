import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';

export interface OrgOption { id: string; name: string }

interface Props {
  options: OrgOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export function OrgCombobox({ options, value, onChange, placeholder = 'Select organization' }: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.name}
                  onSelect={() => { onChange(o.id); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === o.id ? 'opacity-100' : 'opacity-0')} />
                  {o.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
