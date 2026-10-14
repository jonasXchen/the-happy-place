"use client";
import type { Address } from "@/lib/types";
export const emptyAddress: Address = {
  name: "",
  email: "",
  phone: "+65 ",
  block: "",
  street: "",
  building: "",
  unit: "",
  postal: "",
  country: "Singapore",
  instructions: "",
  access: "Lift access",
};
export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`form-field ${className}`}>
      <label>
        {label}
        {children}
      </label>
    </div>
  );
}
export function AddressForm({
  value,
  onChange,
  prefix = "delivery",
}: {
  value: Address;
  onChange: (v: Address) => void;
  prefix?: string;
}) {
  const fields: [keyof Address, string, string?, string?][] = [
    ["name", "Recipient name", "text", "name"],
    ["phone", "Contact number", "tel", "tel"],
    ["email", "Email for order updates", "email", "email"],
    ["block", "Block / house number", "text", "address-line1"],
    ["street", "Street", "text", "address-line1"],
    ["building", "Building name, optional", "text", "address-line2"],
    ["unit", "Floor / unit, if applicable", "text", "address-line2"],
    ["postal", "Postal code", "text", "postal-code"],
  ];
  return (
    <div className="form-grid">
      {fields.map(([key, label, type, auto]) => (
        <div
          className={`form-field ${key === "email" || key === "street" ? "span-2" : ""}`}
          key={key}
        >
          <label htmlFor={`${prefix}-${key}`}>{label}</label>
          <input
            id={`${prefix}-${key}`}
            name={`${prefix}-${key}`}
            required={!["building", "unit"].includes(key)}
            type={type}
            autoComplete={auto}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            pattern={
              key === "postal"
                ? "[0-9]{6}"
                : key === "phone"
                  ? "[+0-9 ()-]{8,25}"
                  : undefined
            }
            maxLength={key === "postal" ? 6 : 150}
          />
        </div>
      ))}
      <div className="form-field">
        <label htmlFor={`${prefix}-country`}>Country</label>
        <input
          id={`${prefix}-country`}
          value="Singapore"
          readOnly
          autoComplete="country-name"
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${prefix}-access`}>
          Access for furniture delivery
        </label>
        <select
          id={`${prefix}-access`}
          value={value.access}
          onChange={(e) => onChange({ ...value, access: e.target.value })}
        >
          <option>Lift access</option>
          <option>Staircase access</option>
          <option>Ground floor</option>
          <option>Other, see delivery instructions</option>
        </select>
      </div>
      <div className="form-field span-2">
        <label htmlFor={`${prefix}-instructions`}>
          Delivery instructions, optional
        </label>
        <textarea
          id={`${prefix}-instructions`}
          placeholder="Gate codes, lift dimensions, staircase floors, or anything our team should know."
          value={value.instructions}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          maxLength={1000}
        />
      </div>
    </div>
  );
}
