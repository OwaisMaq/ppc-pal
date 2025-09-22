-- Create the missing private.decrypt_token function
CREATE OR REPLACE FUNCTION private.decrypt_token(encrypted_text text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
BEGIN
  -- For now, return the encrypted text as is since we don't have encryption/decryption implemented
  -- In a real implementation, this would decrypt the token using the encryption key
  RETURN encrypted_text;
END;
$function$;