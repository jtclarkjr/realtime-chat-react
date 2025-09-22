'use client'

import { useMemo, useState } from 'react'
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

interface ComboboxAction {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: (value: string) => void
  disabled?: (value: string) => boolean
  variant?: 'default' | 'destructive'
}

interface ComboboxOption {
  value: string
  label: string
  description?: string
  actions?: ComboboxAction[]
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
  const [open, setOpen] = useState<boolean>(false)
  const [searchValue, setSearchValue] = useState<string>('')

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
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
            aria-haspopup="listbox"
            aria-label={
              selectedOption ? `Selected: ${selectedOption.label}` : placeholder
            }
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
            <ChevronsUpDown
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            'w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-0',
            contentClassName
          )}
          align="start"
        >
          <Command shouldFilter={false} role="listbox">
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
              aria-label={searchPlaceholder}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                    role="option"
                    aria-selected={value === option.value}
                    className="group"
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
                      <div className="flex items-center gap-1">
                        {/* Action buttons */}
                        {option.actions &&
                          option.actions.map((action, actionIndex) => {
                            const Icon = action.icon
                            const isDisabled =
                              action.disabled?.(option.value) ?? false
                            return (
                              <Button
                                key={actionIndex}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'h-6 w-6 p-0 transition-opacity',
                                  action.variant === 'destructive' &&
                                    'hover:bg-destructive/10 hover:text-destructive',
                                  isDisabled && 'opacity-30 cursor-not-allowed'
                                )}
                                disabled={isDisabled}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!isDisabled) {
                                    action.onClick(option.value)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (!isDisabled) {
                                      action.onClick(option.value)
                                    }
                                  }
                                }}
                                title={`${action.label} for ${option.label}`}
                                aria-label={`${action.label} for ${option.label}`}
                                aria-describedby={
                                  isDisabled
                                    ? `${option.value}-disabled`
                                    : undefined
                                }
                                role="button"
                                tabIndex={isDisabled ? -1 : 0}
                              >
                                <Icon className="h-3 w-3" aria-hidden="true" />
                                <span className="sr-only">
                                  {action.label} for {option.label}
                                </span>
                              </Button>
                            )
                          })}
                        {/* Selection check */}
                        <Check
                          className={cn(
                            'ml-2 h-4 w-4 shrink-0',
                            value === option.value ? 'opacity-100' : 'opacity-0'
                          )}
                          aria-hidden="true"
                        />
                      </div>
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
export type { ComboboxOption, ComboboxAction, ComboboxProps }
