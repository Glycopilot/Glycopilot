/** Textes affichés — adresse France (inscription / profil médecin) */
export const ADDRESS_MSG = {
  intro: 'Adresse de votre structure en France : code postal, ville, puis rue (données officielles).',

  postalIncomplete: (n) => `Code postal : ${n}/5 chiffres (ex. 94320).`,
  postalLoading: 'Recherche des villes en cours…',
  postalNoCity: 'Aucune ville pour ce code postal. Vérifiez les 5 chiffres.',
  postalLoadError: 'Service adresse temporairement indisponible. Réessayez.',
  postalApiError: 'Impossible de charger les villes pour ce code postal.',
  addressServiceError: 'Service adresse indisponible. Réessayez.',
  postalInvalidFormat: 'Le code postal doit contenir 5 chiffres.',
  cityRequired: 'Veuillez sélectionner une ville.',
  postalUnknown: 'Code postal inconnu en France.',
  cityMismatch: 'La ville ne correspond pas à ce code postal.',
  addressTooShort: 'Adresse trop courte (min. 3 caractères).',
  addressNotFound: 'Adresse introuvable. Choisissez une adresse proposée sous le champ.',
  addressNotRecognized: 'Adresse non reconnue. Cliquez sur une adresse dans la liste déroulante.',
  addressRequired: 'Veuillez saisir une adresse.',
  cityAuto: (name) => `Ville renseignée : ${name}.`,
  cityPick: 'Choisissez votre ville dans la liste.',

  selectPostalFirst: 'Saisissez le code postal',
  selectLoading: 'Chargement…',
  selectNoCity: 'Aucune ville',
  selectPickCity: 'Choisir une ville',

  addressNeedPostal: 'Complétez le code postal et la ville.',
  addressPlaceholder: (city) => (city ? 'Ex. 15 avenue de la République' : ADDRESS_MSG.addressNeedPostal),
  addressTypeHint: 'Tapez au moins 3 caractères, puis sélectionnez une adresse dans la liste.',
  addressSearching: 'Recherche d’adresses…',
  addressNoResult: 'Aucune adresse trouvée. Modifiez la saisie ou vérifiez le code postal.',
  addressPickHint: 'Sélectionnez une adresse dans la liste pour valider le formulaire.',
};
