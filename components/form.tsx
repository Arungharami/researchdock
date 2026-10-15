"use client";
import { useActionState } from 'react';
import type { Result } from '@/app/actions';
export function ActionForm({ action, children, label = 'Save', className = '' }: {
    action: (state: Result, data: FormData) => Promise<Result>;
    children: React.ReactNode;
    label?: string;
    className?: string;
}) { const [state, dispatch, pending] = useActionState(action, {}); return <form action={dispatch} className={'form ' + className}>{children}<div aria-live="polite">{state.error && <p className="notice error" role="alert">{state.error}</p>}{state.success && <p className="notice">{state.success}</p>}</div><button disabled={pending} className="button" type="submit">{pending ? 'Working…' : label}</button></form>; }
export function Field({ name, label, defaultValue = '', required = false, type = 'text', minLength, maxLength, placeholder }: {
    name: string;
    label: string;
    defaultValue?: string;
    required?: boolean;
    type?: string;
    minLength?: number;
    maxLength?: number;
    placeholder?: string;
}) { return <label>{label}{type === 'textarea' ? <textarea name={name} defaultValue={defaultValue} required={required} minLength={minLength} maxLength={maxLength} placeholder={placeholder} rows={5}/> : <input name={name} type={type} defaultValue={defaultValue} required={required} minLength={minLength} maxLength={maxLength} placeholder={placeholder}/>}</label>; }
