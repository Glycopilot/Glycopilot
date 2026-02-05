import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class DoctorVerificationService:
    """
    Service pour vérifier la validité d'un médecin via l'API Annuaire Santé (FHIR).
    """

    @staticmethod
    def verify_license(license_number: str, specialty: str = None) -> bool:
        """
        Vérifie si le numéro RPPS (license_number) est valide via l'API configurée.
        Retourne True si vérifié, False sinon.
        """
        api_url = getattr(settings, "LICENCE_VERIFICATION_API", None)

        if not api_url:
            logger.warning("LICENCE_VERIFICATION_API is not set. Skipping real verification.")
            return False

        if not license_number:
            return False

        try:
            # Construction de l'URL query pour FHIR
            # Exemple: GET [base]/Practitioner?identifier={license_number}
            # Si l'URL fournie est déjà l'endpoint de base.
            
            # Simple check to append parameter correctly
            delimiter = "&" if "?" in api_url else "?"
            query_url = f"{api_url}{delimiter}identifier={license_number}"
            
            # Timeout court pour ne pas bloquer l'inscription
            response = requests.get(query_url, timeout=5)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Vérification basique du format FHIR Bundle
                    if "resourceType" in data and data["resourceType"] == "Bundle":
                        if data.get("total", 0) > 0 and len(data.get("entry", [])) > 0:
                            # On a trouvé au moins une entrée correspondant au RPPS
                            return True
                    
                    # Si ce n'est pas du FHIR mais juste un 200 OK (ex: page web), on méfie.
                    # Pour l'instant, on considère que si on reçoit du JSON valide avec du contenu, c'est bon?
                    # Mais si l'URL est une page de documentation (comme celle fournie par l'utilisateur),
                    # elle va retourner du HTML (200 OK) et json() va échouer.
                    
                except requests.exceptions.JSONDecodeError:
                    logger.warning(f"Verification API returned non-JSON response for license {license_number}")
                    return False
            else:
                logger.warning(f"Verification API returned status {response.status_code} for license {license_number}")
                return False

        except requests.RequestException as e:
            logger.error(f"Error connecting to Verification API: {str(e)}")
            return False

        return False
