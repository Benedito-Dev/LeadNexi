import Select, { type GroupBase, type Props, type StylesConfig } from 'react-select'

/** Estilo do react-select do Rizar (`mutaseStyles`), lendo os tokens do tema. */
const mutaseStyles: StylesConfig<any, boolean> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.2)' : 'none',
    borderRadius: 'var(--radius)',
    minHeight: '36px',
    '&:hover': { borderColor: 'hsl(var(--ring))' },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
    borderRadius: 'var(--radius)',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    zIndex: 50,
  }),
  menuList: (base) => ({ ...base, backgroundColor: 'hsl(var(--popover))' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'hsl(var(--primary))' : state.isFocused ? 'hsl(var(--accent))' : 'transparent',
    color: state.isSelected
      ? 'hsl(var(--primary-foreground))'
      : state.isFocused
        ? 'hsl(var(--accent-foreground))'
        : 'hsl(var(--popover-foreground))',
    cursor: 'pointer',
    '&:active': { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
  }),
  noOptionsMessage: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
  loadingMessage: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
  placeholder: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
  singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
  multiValue: (base) => ({ ...base, backgroundColor: 'hsl(var(--accent))', borderRadius: 'var(--radius)' }),
  multiValueLabel: (base) => ({ ...base, color: 'hsl(var(--foreground))', fontSize: '13px' }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' },
  }),
  input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'hsl(var(--border))' }),
  clearIndicator: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': { color: 'hsl(var(--foreground))' },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': { color: 'hsl(var(--foreground))' },
  }),
}

function MutaseSelect<Opcao, Multi extends boolean = false>(props: Props<Opcao, Multi, GroupBase<Opcao>>) {
  return <Select styles={mutaseStyles as StylesConfig<Opcao, Multi>} {...props} />
}

export { MutaseSelect }
