'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onSelect?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
}

function Combobox({
  options,
  value,
  onSelect,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  disabled = false,
  className,
  triggerClassName,
  contentClassName
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options

    return options.filter((option) => {
      const searchLower = searchValue.toLowerCase()
      const labelMatch = option.label.toLowerCase().includes(searchLower)
      const descriptionMatch =
        option.description?.toLowerCase().includes(searchLower) || false
      return labelMatch || descriptionMatch
    })
  }, [options, searchValue])

  const handleSelect = (selectedValue: string) => {
    onSelect?.(selectedValue)
    setOpen(false)
    setSearchValue('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchValue('')
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between h-auto min-h-9 px-3 py-2',
              !selectedOption && 'text-muted-foreground',
              triggerClassName
            )}
            disabled={disabled}
          >
            <div className="flex items-center min-w-0 flex-1">
              {selectedOption ? (
                <span className="font-medium truncate">
                  {selectedOption.label}
                </span>
              ) : (
                <span className="truncate">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            'w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-0',
            contentClassName
          )}
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="font-medium">{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          'ml-2 h-4 w-4 shrink-0',
                          value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { Combobox }
export type { ComboboxOption, ComboboxProps }
